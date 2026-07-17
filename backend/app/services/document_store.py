"""Persistent document ingestion and chunk storage for the knowledge base."""
from __future__ import annotations

import json
import re
import threading
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader

from app.core.config import Settings
from app.models.schemas import DocumentChunk, KnowledgeDocument


class UnsupportedDocumentError(ValueError):
    pass


class DocumentStore:
    """Small JSON-backed store suitable for a single-node product MVP."""

    SUPPORTED_SUFFIXES = {".pdf", ".txt", ".md", ".markdown"}

    def __init__(self, settings: Settings):
        self.settings = settings
        self.root = Path(settings.STORAGE_DIR)
        self.upload_dir = self.root / "uploads"
        self.manifest_path = self.root / "documents.json"
        self._lock = threading.RLock()
        self.root.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def list_documents(self) -> list[KnowledgeDocument]:
        manifest = self._read_manifest()
        records = [KnowledgeDocument.model_validate(item["document"]) for item in manifest]
        return sorted(records, key=lambda item: item.created_at, reverse=True)

    def list_chunks(self) -> list[DocumentChunk]:
        manifest = self._read_manifest()
        return [
            DocumentChunk.model_validate(chunk)
            for item in manifest
            for chunk in item.get("chunks", [])
        ]

    def add_document(self, filename: str, content: bytes) -> KnowledgeDocument:
        safe_name = Path(filename or "document").name
        suffix = Path(safe_name).suffix.lower()
        if suffix not in self.SUPPORTED_SUFFIXES:
            raise UnsupportedDocumentError("仅支持 PDF、TXT 和 Markdown 文件")
        if not content:
            raise ValueError("文件内容为空")
        if len(content) > self.settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise ValueError(f"文件不能超过 {self.settings.MAX_UPLOAD_MB}MB")

        document_id = uuid.uuid4().hex[:12]
        pages = self._extract_pages(suffix, content)
        chunks = self._build_chunks(document_id, safe_name, pages)
        if not chunks:
            raise ValueError("没有从文件中解析出可检索的文字")

        stored_name = f"{document_id}{suffix}"
        stored_path = self.upload_dir / stored_name
        stored_path.write_bytes(content)
        document = KnowledgeDocument(
            id=document_id,
            name=safe_name,
            size=len(content),
            chunk_count=len(chunks),
            status="ready",
            created_at=datetime.now(timezone.utc),
        )

        try:
            with self._lock:
                manifest = self._read_manifest_unlocked()
                manifest.append({
                    "document": document.model_dump(mode="json"),
                    "stored_name": stored_name,
                    "chunks": [chunk.model_dump(mode="json") for chunk in chunks],
                })
                self._write_manifest_unlocked(manifest)
        except Exception:
            stored_path.unlink(missing_ok=True)
            raise
        return document

    def delete_document(self, document_id: str) -> bool:
        with self._lock:
            manifest = self._read_manifest_unlocked()
            match = next(
                (item for item in manifest if item["document"]["id"] == document_id),
                None,
            )
            if match is None:
                return False
            manifest = [
                item for item in manifest if item["document"]["id"] != document_id
            ]
            self._write_manifest_unlocked(manifest)
            file_path = self.upload_dir / match.get("stored_name", "")
            if file_path.is_file():
                file_path.unlink()
            return True

    def get_document_file(self, document_id: str) -> tuple[Path, str] | None:
        """Return the stored source path and original filename."""
        manifest = self._read_manifest()
        match = next(
            (item for item in manifest if item["document"]["id"] == document_id),
            None,
        )
        if match is None:
            return None
        path = self.upload_dir / match.get("stored_name", "")
        if not path.is_file():
            return None
        return path, match["document"]["name"]

    def _extract_pages(self, suffix: str, content: bytes) -> list[tuple[int | None, str]]:
        if suffix == ".pdf":
            try:
                reader = PdfReader(BytesIO(content))
                return [
                    (page_number, page.extract_text() or "")
                    for page_number, page in enumerate(reader.pages, start=1)
                ]
            except Exception as exc:
                raise ValueError(f"PDF 解析失败：{exc}") from exc

        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("文本文件必须使用 UTF-8 编码") from exc
        return [(None, text)]

    def _build_chunks(
        self,
        document_id: str,
        source: str,
        pages: list[tuple[int | None, str]],
    ) -> list[DocumentChunk]:
        chunks: list[DocumentChunk] = []
        chunk_index = 1
        for page, raw_text in pages:
            text = re.sub(r"[ \t]+", " ", raw_text)
            text = re.sub(r"\n{3,}", "\n\n", text).strip()
            start = 0
            while start < len(text):
                end = min(start + self.settings.CHUNK_SIZE, len(text))
                if end < len(text):
                    boundary = max(text.rfind("\n", start, end), text.rfind("。", start, end))
                    if boundary > start + self.settings.CHUNK_SIZE // 2:
                        end = boundary + 1
                chunk_text = text[start:end].strip()
                if chunk_text:
                    chunks.append(DocumentChunk(
                        id=f"K_{document_id}_{chunk_index}",
                        content=chunk_text,
                        source=source,
                        page=page,
                        chunk_type="text",
                        metadata={"document_id": document_id},
                    ))
                    chunk_index += 1
                if end >= len(text):
                    break
                start = max(end - self.settings.CHUNK_OVERLAP, start + 1)
        return chunks

    def _read_manifest(self) -> list[dict]:
        with self._lock:
            return self._read_manifest_unlocked()

    def _read_manifest_unlocked(self) -> list[dict]:
        if not self.manifest_path.exists():
            return []
        try:
            data = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            raise RuntimeError("知识库清单损坏，无法读取") from exc
        if not isinstance(data, list):
            raise RuntimeError("知识库清单格式无效")
        return data

    def _write_manifest_unlocked(self, manifest: list[dict]) -> None:
        temporary_path = self.manifest_path.with_suffix(".tmp")
        temporary_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temporary_path.replace(self.manifest_path)
