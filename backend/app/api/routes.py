"""API routes for the document knowledge workspace."""
import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.models.schemas import (
    DocumentListResponse,
    KnowledgeDocument,
    ProviderConfig,
    QueryRequest,
    QueryResponse,
)
from app.services.document_store import DocumentStore, UnsupportedDocumentError
from app.services.hybrid_retriever import HybridRetriever
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api", tags=["RAG"])

# Initialize services
hybrid_retriever = HybridRetriever()
llm_service = LLMService()
document_store = DocumentStore(get_settings())


def initialize_services() -> None:
    """Load persisted chunks into the retrieval service."""
    hybrid_retriever.initialize(document_store.list_chunks())


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Query documents using hybrid retrieval and generate answer with citations
    
    Args:
        request: Query request with query string and optional top_k
        
    Returns:
        QueryResponse with answer, citations, and retrieved documents
    """
    try:
        # Perform hybrid retrieval
        search_results = hybrid_retriever.search(
            query=request.query,
            top_k=request.top_k
        )
        
        if not document_store.list_documents():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="知识库为空，请先上传文档",
            )

        if not search_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="没有找到相关文档",
            )
        
        # Generate answer with citations
        answer, citations = llm_service.generate_answer(
            query=request.query,
            search_results=search_results,
            provider_config=request.provider_config,
        )
        
        return QueryResponse(
            query=request.query,
            answer=answer,
            citations=citations,
            retrieved_docs=search_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"处理问题失败：{str(e)}",
        )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents():
    """List source files in the current knowledge base."""
    documents = document_store.list_documents()
    return DocumentListResponse(total=len(documents), documents=documents)


@router.post(
    "/documents",
    response_model=KnowledgeDocument,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile = File(...),
    provider_config: str | None = Form(None),
):
    """Parse, persist and index a source document."""
    try:
        content = await file.read()
        parsed_config = None
        if provider_config:
            try:
                parsed_config = ProviderConfig.model_validate(json.loads(provider_config))
            except (json.JSONDecodeError, ValueError) as exc:
                raise ValueError("API 配置格式无效") from exc
        document = document_store.add_document(file.filename or "document", content)
        hybrid_retriever.replace_documents(document_store.list_chunks(), parsed_config)
        return document
    except (UnsupportedDocumentError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文档入库失败：{exc}",
        ) from exc
    finally:
        await file.close()


@router.post("/documents/reindex")
async def reindex_documents(provider_config: ProviderConfig):
    """Rebuild dense retrieval with browser-provided Embedding settings."""
    hybrid_retriever.replace_documents(document_store.list_chunks(), provider_config)
    return {
        "documents": len(document_store.list_documents()),
        "retrieval_mode": "hybrid" if hybrid_retriever.dense_available else "bm25",
        "detail": hybrid_retriever.dense_error,
    }


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    provider_config: ProviderConfig | None = None,
):
    """Remove a source file and rebuild the retrieval index."""
    if not document_store.delete_document(document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文档不存在",
        )
    hybrid_retriever.replace_documents(
        document_store.list_chunks(),
        provider_config,
    )
    return {"deleted": True, "id": document_id}


@router.get("/documents/{document_id}/file", response_class=FileResponse)
async def get_document_file(document_id: str):
    """Open the original file behind a citation."""
    stored_file = document_store.get_document_file(document_id)
    if stored_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="原始文件不存在",
        )
    path, filename = stored_file
    return FileResponse(path, filename=filename, content_disposition_type="inline")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": get_settings().APP_VERSION,
        "documents": len(document_store.list_documents()),
        "retrieval_mode": "hybrid" if hybrid_retriever.dense_available else "bm25",
        "answer_generation": "ready" if get_settings().LLM_API_KEY else "configuration_required",
    }
