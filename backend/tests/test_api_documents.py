from pathlib import Path

from fastapi.testclient import TestClient

from app.api import routes
from app.core.config import Settings
from app.main import app
from app.models.schemas import QueryRequest
from app.services.document_store import DocumentStore


def configure_temporary_store(tmp_path: Path, monkeypatch) -> None:
    settings = Settings(
        STORAGE_DIR=str(tmp_path / "api-knowledge"),
        EMBEDDING_API_KEY="",
        _env_file=None,
    )
    monkeypatch.setattr(routes, "document_store", DocumentStore(settings))
    monkeypatch.setattr(routes.hybrid_retriever.settings, "EMBEDDING_API_KEY", "")
    routes.hybrid_retriever.replace_documents([])


def test_document_api_lifecycle(tmp_path: Path, monkeypatch):
    configure_temporary_store(tmp_path, monkeypatch)

    with TestClient(app) as client:
        empty_response = client.get("/api/documents")
        assert empty_response.status_code == 200
        assert empty_response.json() == {"total": 0, "documents": []}

        upload_response = client.post(
            "/api/documents",
            files={"file": ("manual.txt", "这是可检索的产品手册。".encode(), "text/plain")},
        )
        assert upload_response.status_code == 201
        document = upload_response.json()
        assert document["name"] == "manual.txt"
        assert document["chunk_count"] == 1

        reindex_response = client.post("/api/documents/reindex", json={})
        assert reindex_response.status_code == 200
        assert reindex_response.json()["retrieval_mode"] == "bm25"

        source_response = client.get(f"/api/documents/{document['id']}/file")
        assert source_response.status_code == 200
        assert source_response.content == "这是可检索的产品手册。".encode()

        delete_response = client.delete(f"/api/documents/{document['id']}")
        assert delete_response.status_code == 200
        assert client.get("/api/documents").json()["total"] == 0


def test_empty_knowledge_base_returns_conflict_not_server_error(tmp_path: Path, monkeypatch):
    configure_temporary_store(tmp_path, monkeypatch)

    with TestClient(app) as client:
        response = client.post("/api/query", json={"query": "内容是什么？"})

    assert response.status_code == 409
    assert response.json()["detail"] == "知识库为空，请先上传文档"


def test_upload_rejects_malformed_frontend_config(tmp_path: Path, monkeypatch):
    configure_temporary_store(tmp_path, monkeypatch)

    with TestClient(app) as client:
        response = client.post(
            "/api/documents",
            files={"file": ("manual.txt", b"content", "text/plain")},
            data={"provider_config": "{invalid-json"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "API 配置格式无效"


def test_delete_rebuilds_index_with_frontend_provider_config(tmp_path: Path, monkeypatch):
    configure_temporary_store(tmp_path, monkeypatch)
    captured_configs = []

    def capture_replace_documents(documents, provider_config=None, build_dense=True):
        captured_configs.append(provider_config)

    monkeypatch.setattr(
        routes.hybrid_retriever,
        "replace_documents",
        capture_replace_documents,
    )

    with TestClient(app) as client:
        upload_response = client.post(
            "/api/documents",
            files={"file": ("manual.txt", "保留向量配置".encode(), "text/plain")},
        )
        document_id = upload_response.json()["id"]
        captured_configs.clear()

        delete_response = client.request(
            "DELETE",
            f"/api/documents/{document_id}",
            json={
                "embedding_api_key": "browser-key",
                "embedding_base_url": "https://embedding.example/v1",
                "embedding_model": "embedding-model",
            },
        )

    assert delete_response.status_code == 200
    assert len(captured_configs) == 1
    assert captured_configs[0].embedding_api_key.get_secret_value() == "browser-key"


def test_referential_follow_up_uses_previous_user_question():
    request = QueryRequest.model_validate({
        "query": "第二点是什么意思？",
        "history": [
            {"role": "user", "content": "文档中的风险控制措施有哪些？"},
            {"role": "assistant", "content": "一、身份校验。二、操作审计。"},
        ],
    })

    assert routes.build_retrieval_query(request) == (
        "文档中的风险控制措施有哪些？\n第二点是什么意思？"
    )


def test_upload_rolls_back_when_index_rebuild_fails(tmp_path: Path, monkeypatch):
    configure_temporary_store(tmp_path, monkeypatch)
    calls = 0

    def fail_for_non_empty_index(documents, provider_config=None, build_dense=True):
        nonlocal calls
        calls += 1
        if documents:
            raise RuntimeError("index failed")

    monkeypatch.setattr(
        routes.hybrid_retriever,
        "replace_documents",
        fail_for_non_empty_index,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/documents",
            files={"file": ("rollback.txt", "不应残留".encode(), "text/plain")},
        )

    assert response.status_code == 500
    assert "文档已回滚" in response.json()["detail"]
    assert routes.document_store.list_documents() == []
    assert list(routes.document_store.upload_dir.iterdir()) == []
    assert calls == 2
