"""Sparse retrieval using jieba and rank_bm25"""
import jieba
import numpy as np
from rank_bm25 import BM25Okapi
from typing import List
from app.models.schemas import DocumentChunk, SearchResult


class SparseRetriever:
    """BM25-based sparse retrieval engine"""
    
    def __init__(self):
        self.documents: List[DocumentChunk] = []
        self.tokenized_corpus: List[List[str]] = []
        self.bm25: BM25Okapi = None

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Return normalized searchable tokens, excluding whitespace/punctuation."""
        return [
            token.casefold()
            for raw_token in jieba.cut(text)
            if (token := raw_token.strip()) and any(char.isalnum() for char in token)
        ]
        
    def build_index(self, documents: List[DocumentChunk]) -> None:
        """Build BM25 index from documents"""
        self.documents = documents
        
        if not documents:
            self.tokenized_corpus = []
            self.bm25 = None
            return

        # Tokenize documents using jieba
        self.tokenized_corpus = [self._tokenize(doc.content) for doc in documents]
        
        # Build BM25 index
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        
    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """Search documents using BM25"""
        if self.bm25 is None:
            return []
        
        # Tokenize query
        tokenized_query = self._tokenize(query)
        if not tokenized_query:
            return []
        
        # Get BM25 scores
        scores = self.bm25.get_scores(tokenized_query)
        
        # Get top-k indices
        query_tokens = set(tokenized_query)
        candidate_indices = [
            index
            for index, document_tokens in enumerate(self.tokenized_corpus)
            if query_tokens.intersection(document_tokens)
        ]
        top_indices = sorted(
            candidate_indices,
            key=lambda index: scores[index],
            reverse=True,
        )[:top_k]
        
        # Build results
        results = []
        for rank, idx in enumerate(top_indices):
            results.append(SearchResult(
                doc=self.documents[idx],
                score=float(scores[idx]),
                rank=rank + 1,
                source_type="bm25"
            ))
            
        return results
    
    def get_rank_map(self, query: str, top_k: int = 10) -> dict[str, int]:
        """Get document rank map for RRF fusion"""
        results = self.search(query, top_k)
        return {result.doc.id: result.rank for result in results}
