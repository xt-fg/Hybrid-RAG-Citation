"""Hybrid retrieval pipeline combining sparse and dense retrieval"""
from typing import List, Dict
from app.models.schemas import DocumentChunk, ProviderConfig, SearchResult
from app.services.sparse_retriever import SparseRetriever
from app.services.dense_retriever import DenseRetriever
from app.services.rrf_fusion import RRFFusion
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
        self.dense_available = False
        self.dense_error: str | None = None
        
    def initialize(self, documents: List[DocumentChunk] | None = None) -> None:
        """Initialize retrievers with persisted knowledge-base documents."""
        if self._initialized:
            return

        # Restore dense retrieval from the server-side provider configuration.
        # Provider failures are handled by replace_documents and degrade to BM25.
        self.replace_documents(documents or [])
        self._initialized = True

    def replace_documents(
        self,
        documents: List[DocumentChunk],
        provider_config: ProviderConfig | None = None,
        build_dense: bool = True,
    ) -> None:
        """Atomically rebuild the in-memory retrieval indices."""
        # Build document map
        self.doc_map = {doc.id: doc for doc in documents}

        # Sparse retrieval remains available without any external provider.
        self.sparse_retriever.build_index(documents)

        self.dense_available = False
        self.dense_error = None
        frontend_embedding_key = (
            provider_config.embedding_api_key.get_secret_value()
            if provider_config and provider_config.embedding_api_key
            else ""
        )
        if documents and not build_dense:
            self.dense_retriever.build_index([])
            self.dense_error = "等待可用的 Embedding 配置，当前使用 BM25"
        elif documents and (frontend_embedding_key or self.settings.EMBEDDING_API_KEY):
            try:
                self.dense_retriever.build_index(documents, provider_config)
                self.dense_available = True
            except Exception as exc:
                # A missing or temporarily unavailable embedding provider should
                # not make document management and lexical retrieval unusable.
                self.dense_retriever.build_index([])
                self.dense_error = str(exc)
        elif documents:
            self.dense_error = "未配置 Embedding API，已降级为 BM25"

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

        if not self.doc_map:
            return []
            
        top_k = top_k or self.settings.TOP_K
        
        if use_rrf and self.dense_available:
            return self._search_with_rrf(query, top_k)
        else:
            return self._search_simple(query, top_k)
            
    def _search_with_rrf(self, query: str, top_k: int) -> List[SearchResult]:
        """Search with RRF fusion"""
        # Get rank maps from both retrievers
        sparse_rank_map = self.sparse_retriever.get_rank_map(query, top_k=top_k * 2)
        try:
            dense_rank_map = self.dense_retriever.get_rank_map(query, top_k=top_k * 2)
        except Exception as exc:
            # A provider that becomes unavailable after indexing must not break
            # lexical retrieval for the whole request path.
            self.dense_available = False
            self.dense_error = f"查询向量生成失败，已降级为 BM25：{exc}"
            return self.sparse_retriever.search(query, top_k)
        
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
