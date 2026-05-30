"""Hybrid retrieval pipeline combining sparse and dense retrieval"""
from typing import List, Dict
from app.models.schemas import DocumentChunk, SearchResult
from app.services.sparse_retriever import SparseRetriever
from app.services.dense_retriever import DenseRetriever
from app.services.rrf_fusion import RRFFusion
from app.data.mock_docs import get_mock_documents
from app.core.config import get_settings


class HybridRetriever:
    """Hybrid retrieval engine combining BM25 and dense retrieval with RRF fusion"""
    
    def __init__(self):
        self.settings = get_settings()
        self.sparse_retriever = SparseRetriever()
        self.dense_retriever = DenseRetriever()
        self.rrf_fusion = RRFFusion(k=self.settings.RRF_K)
        self.doc_map: Dict[str, DocumentChunk] = {}
        self._initialized = False
        
    def initialize(self) -> None:
        """Initialize retrievers with mock documents"""
        if self._initialized:
            return
            
        # Load mock documents
        documents = get_mock_documents()
        
        # Build document map
        self.doc_map = {doc.id: doc for doc in documents}
        
        # Build indices
        self.sparse_retriever.build_index(documents)
        self.dense_retriever.build_index(documents)
        
        self._initialized = True
        
    def search(
        self,
        query: str,
        top_k: int = None,
        use_rrf: bool = True
    ) -> List[SearchResult]:
        """Search using hybrid retrieval
        
        Args:
            query: Search query
            top_k: Number of results to return (default: from settings)
            use_rrf: Whether to use RRF fusion (default: True)
            
        Returns:
            List of search results
        """
        if not self._initialized:
            self.initialize()
            
        top_k = top_k or self.settings.TOP_K
        
        if use_rrf:
            return self._search_with_rrf(query, top_k)
        else:
            return self._search_simple(query, top_k)
            
    def _search_with_rrf(self, query: str, top_k: int) -> List[SearchResult]:
        """Search with RRF fusion"""
        # Get rank maps from both retrievers
        sparse_rank_map = self.sparse_retriever.get_rank_map(query, top_k=top_k * 2)
        dense_rank_map = self.dense_retriever.get_rank_map(query, top_k=top_k * 2)
        
        # Fuse using RRF
        results = self.rrf_fusion.fuse_weighted(
            rank_maps=[sparse_rank_map, dense_rank_map],
            weights=[self.settings.BM25_WEIGHT, self.settings.DENSE_WEIGHT],
            doc_map=self.doc_map,
            top_k=top_k
        )
        
        return results
        
    def _search_simple(self, query: str, top_k: int) -> List[SearchResult]:
        """Search without fusion (use single retriever)"""
        # Use BM25 only
        return self.sparse_retriever.search(query, top_k)
