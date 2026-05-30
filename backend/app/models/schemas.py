"""Pydantic models for request/response"""
from pydantic import BaseModel, Field
from typing import List, Optional


class DocumentChunk(BaseModel):
    """Document chunk with metadata"""
    id: str = Field(..., description="Unique document ID")
    content: str = Field(..., description="Document content")
    source: str = Field(..., description="Document source/filename")
    page: Optional[int] = Field(None, description="Page number")
    chunk_type: str = Field("text", description="Chunk type: text, table, formula")
    metadata: Optional[dict] = Field(default_factory=dict, description="Additional metadata")


class SearchResult(BaseModel):
    """Search result with score"""
    doc: DocumentChunk
    score: float = Field(..., description="Relevance score")
    rank: int = Field(..., description="Rank position")
    source_type: str = Field(..., description="bm25, dense, or rrf")


class QueryRequest(BaseModel):
    """Query request"""
    query: str = Field(..., min_length=1, max_length=1000, description="User query")
    top_k: Optional[int] = Field(5, ge=1, le=20, description="Number of results")


class Citation(BaseModel):
    """Citation reference"""
    doc_id: str
    doc_source: str
    snippet: str
    relevance_score: float


class QueryResponse(BaseModel):
    """Query response with answer and citations"""
    query: str
    answer: str
    citations: List[Citation]
    retrieved_docs: List[SearchResult]
