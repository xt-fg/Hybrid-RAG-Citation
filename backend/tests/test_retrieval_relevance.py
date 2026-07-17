import numpy as np

from app.models.schemas import DocumentChunk
from app.services.dense_retriever import DenseRetriever
from app.services.hybrid_retriever import HybridRetriever
from app.services.sparse_retriever import SparseRetriever


def chunk(doc_id: str, content: str) -> DocumentChunk:
    return DocumentChunk(id=doc_id, content=content, source="test.txt")


def test_sparse_search_discards_documents_without_query_token_overlap():
    retriever = SparseRetriever()
    retriever.build_index([chunk("K_finance_1", "苹果公司年度财务报告")])

    assert retriever.search("量子纠缠与黑洞") == []
    assert [result.doc.id for result in retriever.search("苹果公司")] == ["K_finance_1"]


def test_dense_search_discards_results_below_similarity_threshold(monkeypatch):
    retriever = DenseRetriever()
    monkeypatch.setattr(retriever.settings, "DENSE_MIN_SCORE", 0.7)
    retriever.documents = [
        chunk("K_relevant_1", "相关内容"),
        chunk("K_unrelated_1", "无关内容"),
    ]
    retriever.doc_embeddings = np.array([[1.0, 0.0], [0.0, 1.0]])

    class FakeEmbeddings:
        def embed_query(self, _: str) -> list[float]:
            return [0.8, 0.6]

    retriever.embeddings = FakeEmbeddings()

    results = retriever.search("问题")

    assert [result.doc.id for result in results] == ["K_relevant_1"]


def test_initialize_restores_dense_index_with_server_config(monkeypatch):
    retriever = HybridRetriever()
    documents = [chunk("K_restart_1", "重启后仍应恢复向量索引")]
    monkeypatch.setattr(retriever.settings, "EMBEDDING_API_KEY", "server-key")
    captured_documents = []

    def fake_build_index(items, provider_config=None):
        captured_documents.extend(items)
        retriever.dense_retriever.documents = items
        retriever.dense_retriever.doc_embeddings = np.ones((len(items), 2)) if items else None

    monkeypatch.setattr(retriever.dense_retriever, "build_index", fake_build_index)

    retriever.initialize(documents)

    assert captured_documents == documents
    assert retriever.dense_available is True


def test_query_time_dense_failure_degrades_to_sparse(monkeypatch):
    retriever = HybridRetriever()
    documents = [chunk("K_fallback_1", "苹果公司的风险控制措施")]
    retriever.replace_documents(documents, build_dense=False)
    retriever.dense_available = True

    def fail_dense_query(query, top_k=10):
        raise RuntimeError("embedding provider unavailable")

    monkeypatch.setattr(retriever.dense_retriever, "get_rank_map", fail_dense_query)

    results = retriever.search("苹果公司", top_k=5)

    assert [result.doc.id for result in results] == ["K_fallback_1"]
    assert results[0].source_type == "bm25"
    assert retriever.dense_available is False
    assert "已降级为 BM25" in retriever.dense_error
