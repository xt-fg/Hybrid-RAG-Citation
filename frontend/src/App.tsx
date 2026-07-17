import { useEffect, useRef, useState } from 'react';
import type { Citation, KnowledgeDocument, Message, ProviderConfig, SearchResult } from './types';
import {
  deleteDocument,
  listDocuments,
  queryDocuments,
  reindexDocuments,
  uploadDocument,
} from './services/api';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ReferencePanel } from './components/ReferencePanel';
import { ApiSettingsModal } from './components/ApiSettingsModal';

const MESSAGE_STORAGE_KEY = 'source-lens.messages.v2';
const API_CONFIG_STORAGE_KEY = 'source-lens.api-config.v1';
const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  llm_api_key: '',
  llm_base_url: 'https://api.openai.com/v1',
  llm_model: 'gpt-4o-mini',
  embedding_api_key: '',
  embedding_base_url: 'https://api.openai.com/v1',
  embedding_model: 'text-embedding-3-small',
};

function createId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (!stored) return [];
    const messages = JSON.parse(stored) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    return messages.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }));
  } catch {
    return [];
  }
}

function loadProviderConfig(): ProviderConfig {
  try {
    const stored = sessionStorage.getItem(API_CONFIG_STORAGE_KEY);
    return stored ? { ...DEFAULT_PROVIDER_CONFIG, ...JSON.parse(stored) } : DEFAULT_PROVIDER_CONFIG;
  } catch {
    return DEFAULT_PROVIDER_CONFIG;
  }
}

function formatRequestError(error: unknown): string {
  const message = error instanceof Error ? error.message : '服务暂时不可用，请稍后重试';
  if (/401|invalid.?key|api key/i.test(message)) {
    return 'API 鉴权失败。请更新 API 配置，然后重试本次请求。';
  }
  return message;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function App() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const lastAnswer = [...messages].reverse().find((message) => message.role === 'assistant');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(loadProviderConfig);
  const initialProviderConfigRef = useRef(providerConfig);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isSavingApiConfig, setIsSavingApiConfig] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>(lastAnswer?.citations || []);
  const [currentDocs, setCurrentDocs] = useState<SearchResult[]>(lastAnswer?.retrievedDocs || []);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Unable to persist conversation', error);
    }
    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer) {
      window.requestAnimationFrame(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, [messages]);

  useEffect(() => {
    let active = true;
    listDocuments()
      .then((response) => {
        if (!active) return;
        setDocuments(response.documents);
        const startupConfig = initialProviderConfigRef.current;
        if (response.total > 0 && startupConfig.embedding_api_key) {
          reindexDocuments(startupConfig)
            .then((result) => {
              if (active && result.retrieval_mode === 'bm25') {
                setNotice({ type: 'error', text: result.detail || 'Embedding 不可用，当前使用 BM25' });
              }
            })
            .catch((error) => {
              if (active) setNotice({ type: 'error', text: formatRequestError(error) });
            });
        }
      })
      .catch((error) => {
        if (active) setNotice({ type: 'error', text: error instanceof Error ? error.message : '知识库加载失败' });
      })
      .finally(() => {
        if (active) setIsLoadingDocuments(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const hasFrontendApi = Boolean(providerConfig.llm_api_key || providerConfig.embedding_api_key);

  const executeQuery = async (content: string, appendUserMessage: boolean) => {
    if (documents.length === 0) return;
    if (appendUserMessage) {
      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((previous) => [...previous, userMessage]);
    }
    setIsLoading(true);

    try {
      const response = await queryDocuments({
        query: content,
        top_k: 6,
        provider_config: providerConfig,
      });
      const answer = typeof response.answer === 'string'
        ? response.answer
        : JSON.stringify(response.answer);
      const citations = Array.isArray(response.citations) ? response.citations : [];
      const retrievedDocs = Array.isArray(response.retrieved_docs) ? response.retrieved_docs : [];
      const assistantMessage: Message = {
        id: createId(),
        role: 'assistant',
        content: answer,
        citations,
        retrievedDocs,
        timestamp: new Date(),
      };
      setCurrentCitations(citations);
      setCurrentDocs(retrievedDocs);
      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: createId(),
        role: 'assistant',
        content: formatRequestError(error),
        timestamp: new Date(),
        status: 'error',
        retryQuery: content,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (content: string) => executeQuery(content, true);

  const handleRetry = async (message: Message, retryQuery?: string) => {
    const query = retryQuery || message.retryQuery;
    if (!query || isLoading) return;
    setMessages((previous) => previous.filter((item) => item.id !== message.id));
    await executeQuery(query, false);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setNotice(null);
    try {
      const document = await uploadDocument(file, providerConfig);
      setDocuments((previous) => [document, ...previous]);
      setNotice({ type: 'success', text: `${document.name} 已解析并加入知识库` });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : '文档上传失败' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveApiConfig = async (config: ProviderConfig) => {
    setIsSavingApiConfig(true);
    setProviderConfig(config);
    sessionStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(config));
    try {
      if (documents.length > 0) {
        const result = await reindexDocuments(config);
        if (result.retrieval_mode === 'bm25' && config.embedding_api_key) {
          setIsApiSettingsOpen(false);
          setNotice({ type: 'error', text: result.detail || 'Embedding 配置不可用，当前已降级为 BM25' });
          return;
        }
      }
      setIsApiSettingsOpen(false);
      setNotice({
        type: 'success',
        text: config.llm_api_key ? '前端 API 配置已生效' : '已切换为服务器 API 配置',
      });
    } catch (error) {
      setIsApiSettingsOpen(false);
      setNotice({ type: 'error', text: formatRequestError(error) });
    } finally {
      setIsSavingApiConfig(false);
    }
  };

  const handleDelete = async (document: KnowledgeDocument) => {
    if (!window.confirm(`确定从知识库中删除“${document.name}”吗？`)) return;
    try {
      await deleteDocument(document.id, providerConfig);
      setDocuments((previous) => previous.filter((item) => item.id !== document.id));
      setNotice({ type: 'success', text: `${document.name} 已删除` });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : '删除失败' });
    }
  };

  const handleCitationClick = (docId: string, message: Message) => {
    setCurrentCitations(message.citations || []);
    setCurrentDocs(message.retrievedDocs || []);
    setHighlightedDocId(docId);
    setIsSourcesOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const sourceElement = document.getElementById(`doc-${docId}`);
        const sourceList = sourceElement?.closest('.sources-list');
        if (sourceElement && sourceList instanceof HTMLElement) {
          sourceList.scrollTo({
            top: sourceElement.offsetTop - sourceList.clientHeight / 2 + sourceElement.clientHeight / 2,
            behavior: 'smooth',
          });
        }
      });
    });
    window.setTimeout(() => setHighlightedDocId(null), 2200);
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentCitations([]);
    setCurrentDocs([]);
    setIsSourcesOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className="workspace-sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h4" />
            </svg>
          </div>
          <div><strong>知源</strong><span>文档知识工作台</span></div>
        </div>

        <button className="new-chat-button" type="button" onClick={startNewConversation}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
          </svg>
          新建对话
        </button>

        <div className="knowledge-heading">
          <span>当前知识库</span>
          <span>{documents.length}</span>
        </div>

        <button
          className="sidebar-upload"
          type="button"
          onClick={() => document.getElementById('knowledge-file-input')?.click()}
          disabled={isUploading}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" />
          </svg>
          <span><strong>{isUploading ? '正在解析文档…' : '上传文档'}</strong><small>PDF、TXT 或 Markdown</small></span>
        </button>

        <div className="document-list">
          {isLoadingDocuments ? (
            <p className="sidebar-status">正在读取知识库…</p>
          ) : documents.length === 0 ? (
            <p className="sidebar-status">知识库中还没有文档</p>
          ) : documents.map((document) => (
            <div className="document-item" key={document.id}>
              <div className="document-icon">{document.name.split('.').pop()?.slice(0, 3).toUpperCase()}</div>
              <div className="document-info">
                <strong title={document.name}>{document.name}</strong>
                <span>{document.chunk_count} 个片段 · {formatBytes(document.size)}</span>
              </div>
              <button type="button" onClick={() => handleDelete(document)} title="删除文档" aria-label={`删除 ${document.name}`}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m8 8 8 8m0-8-8 8" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div>
            <span className={`status-dot ${documents.length ? 'online' : ''}`} />
            {documents.length ? '知识库已就绪' : '等待添加资料'}
          </div>
          <button type="button" onClick={() => setIsApiSettingsOpen(true)}>API 配置</button>
        </div>
      </aside>

      <main className="conversation-panel">
        <header className="conversation-header">
          <div>
            <span className="eyebrow">KNOWLEDGE ASSISTANT</span>
            <h1>文档问答</h1>
          </div>
          <div className="header-context">
            <button className={`api-config-button ${hasFrontendApi ? 'is-custom' : ''}`} type="button" onClick={() => setIsApiSettingsOpen(true)}>
              <span className="status-dot online" />
              {hasFrontendApi ? '前端 API' : '服务端 API'}
            </button>
            <span>{documents.length} 份资料</span>
            <span className="context-separator" />
            <span>引用可溯源</span>
          </div>
          <button className="mobile-sources-button" type="button" onClick={() => setIsSourcesOpen(true)} disabled={currentDocs.length === 0}>
            来源 {currentCitations.length || currentDocs.length}
          </button>
          <button className={`mobile-api-button ${hasFrontendApi ? 'is-custom' : ''}`} type="button" onClick={() => setIsApiSettingsOpen(true)}>
            API
          </button>
        </header>

        {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

        <div className="messages-scroll" ref={messagesScrollRef}>
          {messages.length === 0 ? (
            <div className="welcome-state">
              <span className="welcome-badge">基于你的资料回答</span>
              <h2>{documents.length ? '从文档中找到可靠答案' : '先建立你的知识库'}</h2>
              <p>
                {documents.length
                  ? '我会结合关键词与语义检索回答问题，并为关键结论附上可核验的原文引用。'
                  : '上传 PDF、TXT 或 Markdown。系统会自动解析和建立索引，资料只保存在当前服务中。'}
              </p>
              {documents.length === 0 ? (
                <button type="button" className="primary-action" onClick={() => document.getElementById('knowledge-file-input')?.click()}>
                  选择第一份文档
                </button>
              ) : (
                <div className="suggestion-grid">
                  {['总结这些资料的核心观点', '不同文档之间有哪些共同结论？', '列出关键数据并标注来源'].map((question) => (
                    <button key={question} type="button" onClick={() => handleSend(question)}>{question}<span>→</span></button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => {
                const inferredRetryQuery = message.status === 'error' && !message.retryQuery
                  ? [...messages.slice(0, index)].reverse().find((item) => item.role === 'user')?.content
                  : message.retryQuery;
                const displayedMessage = inferredRetryQuery
                  ? { ...message, retryQuery: inferredRetryQuery }
                  : message;
                return (
                  <ChatMessage
                    key={message.id}
                    message={displayedMessage}
                    onCitationClick={(docId) => handleCitationClick(docId, message)}
                    onRetry={() => handleRetry(message, inferredRetryQuery)}
                    onConfigureApi={() => setIsApiSettingsOpen(true)}
                    isLoading={isLoading}
                  />
                );
              })}
              {isLoading && (
                <div className="answer-loading">
                  <div className="assistant-avatar">知</div>
                  <div><span /><span /><span /><small>正在检索资料并组织回答</small></div>
                </div>
              )}
            </div>
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          onUpload={handleUpload}
          isLoading={isLoading}
          isUploading={isUploading}
          documentCount={documents.length}
        />
      </main>

      <aside className={`sources-sidebar ${isSourcesOpen ? 'mobile-open' : ''}`}>
        <ReferencePanel
          citations={currentCitations}
          retrievedDocs={currentDocs}
          highlightedDocId={highlightedDocId}
          onClose={() => setIsSourcesOpen(false)}
        />
      </aside>

      {isApiSettingsOpen && (
        <ApiSettingsModal
          open
          config={providerConfig}
          isSaving={isSavingApiConfig}
          onClose={() => setIsApiSettingsOpen(false)}
          onSave={handleSaveApiConfig}
        />
      )}
    </div>
  );
}

export default App;
