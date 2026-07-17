"""Pydantic models for request/response"""
from pydantic import BaseModel, Field, SecretStr
from datetime import datetime
from typing import List, Literal, Optional


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


class ProviderConfig(BaseModel):
    """Optional browser-provided model configuration with request-level priority."""
    llm_api_key: Optional[SecretStr] = None
    llm_base_url: Optional[str] = Field(None, max_length=500)
    llm_model: Optional[str] = Field(None, max_length=200)
    embedding_api_key: Optional[SecretStr] = None
    embedding_base_url: Optional[str] = Field(None, max_length=500)
    embedding_model: Optional[str] = Field(None, max_length=200)


class ConversationTurn(BaseModel):
    """A bounded user/assistant turn supplied as conversational context."""
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class QueryRequest(BaseModel):
    """Query request"""
    query: str = Field(..., min_length=1, max_length=1000, description="User query")
    top_k: Optional[int] = Field(5, ge=1, le=20, description="Number of results")
    provider_config: Optional[ProviderConfig] = None
    history: List[ConversationTurn] = Field(default_factory=list, max_length=12)


class Citation(BaseModel):
    """Citation reference"""
    doc_id: str
    doc_source: str
    snippet: str
    relevance_score: float
    page: Optional[int] = None


class QueryResponse(BaseModel):
    """Query response with answer and citations"""
    query: str
    answer: str
    citations: List[Citation]
    retrieved_docs: List[SearchResult]


class KnowledgeDocument(BaseModel):
    """A source document stored in the knowledge base."""
    id: str
    name: str
    size: int
    chunk_count: int
    status: str = "ready"
    created_at: datetime


class DocumentListResponse(BaseModel):
    total: int
    documents: List[KnowledgeDocument]
