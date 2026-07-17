from pathlib import Path

import pytest

from app.core.config import Settings
from app.services.document_store import DocumentStore, UnsupportedDocumentError


def make_store(tmp_path: Path, **overrides) -> DocumentStore:
    settings = Settings(
        STORAGE_DIR=str(tmp_path / "knowledge"),
        CHUNK_SIZE=80,
        CHUNK_OVERLAP=12,
        MAX_UPLOAD_MB=1,
        _env_file=None,
        **overrides,
    )
    return DocumentStore(settings)


def test_text_document_is_persisted_chunked_and_deleted(tmp_path: Path):
    store = make_store(tmp_path)
    content = ("第一段介绍产品能力。\n\n第二段说明引用可以追溯。\n" * 8).encode()

    document = store.add_document("产品说明.md", content)

    assert document.name == "产品说明.md"
    assert document.chunk_count > 1
    assert len(store.list_documents()) == 1
    chunks = store.list_chunks()
    assert len(chunks) == document.chunk_count
    assert all(chunk.source == "产品说明.md" for chunk in chunks)
    assert all(chunk.metadata["document_id"] == document.id for chunk in chunks)
    stored_file = store.get_document_file(document.id)
    assert stored_file is not None
    assert stored_file[0].read_bytes() == content
    assert stored_file[1] == "产品说明.md"

    reloaded_store = make_store(tmp_path)
    assert reloaded_store.list_documents()[0].id == document.id
    assert reloaded_store.delete_document(document.id) is True
    assert reloaded_store.list_documents() == []
    assert reloaded_store.list_chunks() == []
    assert reloaded_store.get_document_file(document.id) is None


def test_rejects_unsupported_and_empty_documents(tmp_path: Path):
    store = make_store(tmp_path)

    with pytest.raises(UnsupportedDocumentError):
        store.add_document("archive.zip", b"content")
    with pytest.raises(ValueError, match="内容为空"):
        store.add_document("empty.txt", b"")


def test_filename_is_sanitized(tmp_path: Path):
    store = make_store(tmp_path)

    document = store.add_document("../../safe.txt", "可靠内容".encode())

    assert document.name == "safe.txt"
    assert not (tmp_path / "safe.txt").exists()
