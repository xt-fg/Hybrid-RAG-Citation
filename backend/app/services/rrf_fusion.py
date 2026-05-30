"""Reciprocal Rank Fusion (RRF) algorithm implementation"""
from typing import List, Dict
from app.models.schemas import DocumentChunk, SearchResult
from app.core.config import get_settings


class RRFFusion:
    """RRF algorithm for fusing multiple retrieval results"""
    
    def __init__(self, k: int = None):
        """Initialize RRF with parameter k
        
        Args:
            k: Smoothing constant (default: from settings, typically 60)
        """
        settings = get_settings()
        self.k = k or settings.RRF_K
        
    def fuse(
        self,
        rank_maps: List[Dict[str, int]],
        doc_map: Dict[str, DocumentChunk],
        top_k: int = 5
    ) -> List[SearchResult]:
        """Fuse multiple rank maps using RRF
        
        Args:
            rank_maps: List of {doc_id: rank} dicts from different retrievers
            doc_map: {doc_id: DocumentChunk} for looking up document content
            top_k: Number of top results to return
            
        Returns:
            Fused and re-ranked search results
        """
        # Calculate RRF scores for each document
        rrf_scores: Dict[str, float] = {}
        
        for rank_map in rank_maps:
            for doc_id, rank in rank_map.items():
                if doc_id not in rrf_scores:
                    rrf_scores[doc_id] = 0.0
                # RRF formula: score = 1 / (k + rank)
                rrf_scores[doc_id] += 1.0 / (self.k + rank)
                
        # Sort by RRF score (descending)
        sorted_docs = sorted(
            rrf_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_k]
        
        # Build results
        results = []
        for rank, (doc_id, score) in enumerate(sorted_docs):
            if doc_id in doc_map:
                results.append(SearchResult(
                    doc=doc_map[doc_id],
                    score=score,
                    rank=rank + 1,
                    source_type="rrf"
                ))
                
        return results
    
    def fuse_weighted(
        self,
        rank_maps: List[Dict[str, int]],
        weights: List[float],
        doc_map: Dict[str, DocumentChunk],
        top_k: int = 5
    ) -> List[SearchResult]:
        """Fuse multiple rank maps with weights using RRF
        
        Args:
            rank_maps: List of {doc_id: rank} dicts
            weights: Weight for each rank map
            doc_map: {doc_id: DocumentChunk}
            top_k: Number of results to return
            
        Returns:
            Weighted fused and re-ranked results
        """
        # Calculate weighted RRF scores
        rrf_scores: Dict[str, float] = {}
        
        for rank_map, weight in zip(rank_maps, weights):
            for doc_id, rank in rank_map.items():
                if doc_id not in rrf_scores:
                    rrf_scores[doc_id] = 0.0
                # Weighted RRF: weight * 1/(k + rank)
                rrf_scores[doc_id] += weight * (1.0 / (self.k + rank))
                
        # Sort by RRF score (descending)
        sorted_docs = sorted(
            rrf_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_k]
        
        # Build results
        results = []
        for rank, (doc_id, score) in enumerate(sorted_docs):
            if doc_id in doc_map:
                results.append(SearchResult(
                    doc=doc_map[doc_id],
                    score=score,
                    rank=rank + 1,
                    source_type="rrf"
                ))
                
        return results
