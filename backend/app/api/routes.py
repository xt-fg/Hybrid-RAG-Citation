"""API routes for Hybrid RAG"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import QueryRequest, QueryResponse
from app.services.hybrid_retriever import HybridRetriever
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api", tags=["RAG"])

# Initialize services
hybrid_retriever = HybridRetriever()
llm_service = LLMService()


@router.on_event("startup")
async def startup_event():
    """Initialize retriever on startup"""
    hybrid_retriever.initialize()


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
        
        if not search_results:
            raise HTTPException(
                status_code=404,
                detail="No relevant documents found"
            )
        
        # Generate answer with citations
        answer, citations = llm_service.generate_answer(
            query=request.query,
            search_results=search_results
        )
        
        return QueryResponse(
            query=request.query,
            answer=answer,
            citations=citations,
            retrieved_docs=search_results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )


@router.get("/documents")
async def list_documents():
    """List all available mock documents"""
    from app.data.mock_docs import get_mock_documents
    
    documents = get_mock_documents()
    return {
        "total": len(documents),
        "documents": [
            {
                "id": doc.id,
                "source": doc.source,
                "chunk_type": doc.chunk_type,
                "preview": doc.content[:100] + "..."
            }
            for doc in documents
        ]
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}
