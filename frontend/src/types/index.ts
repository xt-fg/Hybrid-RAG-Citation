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
  page?: number;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  size: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

export interface DocumentListResponse {
  total: number;
  documents: KnowledgeDocument[];
}

export interface ProviderConfig {
  llm_api_key: string;
  llm_base_url: string;
  llm_model: string;
  embedding_api_key: string;
  embedding_base_url: string;
  embedding_model: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface QueryRequest {
  query: string;
  top_k?: number;
  provider_config?: ProviderConfig;
  history?: ConversationTurn[];
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
  status?: 'default' | 'error';
  retryQuery?: string;
}
