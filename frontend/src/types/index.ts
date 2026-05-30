export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  page?: number;
  chunk_type: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  doc: DocumentChunk;
  score: number;
  rank: number;
  source_type: string;
}

export interface Citation {
  doc_id: string;
  doc_source: string;
  snippet: string;
  relevance_score: number;
}

export interface QueryRequest {
  query: string;
  top_k?: number;
}

export interface QueryResponse {
  query: string;
  answer: string;
  citations: Citation[];
  retrieved_docs: SearchResult[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  retrievedDocs?: SearchResult[];
  timestamp: Date;
}
