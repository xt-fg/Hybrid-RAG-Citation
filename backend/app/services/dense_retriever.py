"""Dense retrieval using OpenAI embeddings and numpy"""
import numpy as np
from typing import List, Optional
from langchain_openai import OpenAIEmbeddings
from app.models.schemas import DocumentChunk, SearchResult
from app.core.config import get_settings


class DenseRetriever:
    """Embedding-based dense retrieval engine"""
    
    def __init__(self):
        self.settings = get_settings()
        self.embeddings = OpenAIEmbeddings(
            model=self.settings.EMBEDDING_MODEL,
            openai_api_key=self.settings.OPENAI_API_KEY,
            openai_api_base=self.settings.OPENAI_BASE_URL,
        )
        self.documents: List[DocumentChunk] = []
        self.doc_embeddings: Optional[np.ndarray] = None
        
    def build_index(self, documents: List[DocumentChunk]) -> None:
        """Build embedding index from documents"""
        self.documents = documents
        
        # Get embeddings for all documents
        texts = [doc.content for doc in documents]
        embedding_list = self.embeddings.embed_documents(texts)
        
        # Convert to numpy array and normalize
        self.doc_embeddings = np.array(embedding_list)
        # Normalize for cosine similarity
        norms = np.linalg.norm(self.doc_embeddings, axis=1, keepdims=True)
        self.doc_embeddings = self.doc_embeddings / norms
        
    def _cosine_similarity(self, query_embedding: np.ndarray) -> np.ndarray:
        """Calculate cosine similarity between query and all documents"""
        # Normalize query
        query_norm = query_embedding / np.linalg.norm(query_embedding)
        
        # Calculate cosine similarity
        similarities = np.dot(self.doc_embeddings, query_norm)
        
        return similarities
    
    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """Search documents using embedding similarity"""
        if self.doc_embeddings is None:
            raise ValueError("Index not built. Call build_index first.")
        
        # Get query embedding
        query_embedding = self.embeddings.embed_query(query)
        query_array = np.array(query_embedding)
        
        # Calculate similarities
        similarities = self._cosine_similarity(query_array)
        
        # Get top-k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Build results
        results = []
        for rank, idx in enumerate(top_indices):
            results.append(SearchResult(
                doc=self.documents[idx],
                score=float(similarities[idx]),
                rank=rank + 1,
                source_type="dense"
            ))
            
        return results
    
    def get_rank_map(self, query: str, top_k: int = 10) -> dict[str, int]:
        """Get document rank map for RRF fusion"""
        results = self.search(query, top_k)
        return {result.doc.id: result.rank for result in results}
