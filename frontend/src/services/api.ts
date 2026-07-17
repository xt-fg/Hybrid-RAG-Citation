import type {
  DocumentListResponse,
  KnowledgeDocument,
  ProviderConfig,
  QueryRequest,
  QueryResponse,
} from '../types';

const API_BASE_URL = '/api';

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

export async function queryDocuments(request: QueryRequest): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, '问答请求失败'));
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

export async function listDocuments(): Promise<DocumentListResponse> {
  const response = await fetch(`${API_BASE_URL}/documents`);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, '获取知识库失败'));
  }
  return response.json();
}

export async function uploadDocument(file: File, providerConfig?: ProviderConfig): Promise<KnowledgeDocument> {
  const body = new FormData();
  body.append('file', file);
  if (providerConfig) body.append('provider_config', JSON.stringify(providerConfig));
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    body,
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, '文档上传失败'));
  }
  return response.json();
}

export async function reindexDocuments(providerConfig: ProviderConfig): Promise<{
  documents: number;
  retrieval_mode: 'hybrid' | 'bm25';
  detail?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/documents/reindex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(providerConfig),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, '重新建立索引失败'));
  }
  return response.json();
}

export async function deleteDocument(documentId: string, providerConfig?: ProviderConfig): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers: providerConfig ? { 'Content-Type': 'application/json' } : undefined,
    body: providerConfig ? JSON.stringify(providerConfig) : undefined,
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, '删除文档失败'));
  }
}
