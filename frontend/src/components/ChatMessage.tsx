import { useState } from 'react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onCitationClick: (docId: string) => void;
  onRetry: () => void;
  onConfigureApi: () => void;
  isLoading: boolean;
}

export function ChatMessage({
  message,
  onCitationClick,
  onRetry,
  onConfigureApi,
  isLoading,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const safeContent = typeof message.content === 'string' ? message.content : String(message.content ?? '');

  const renderContent = (content: string) => {
    const normalized = content
      .replace(/([^\s])\[/g, '$1 [')
      .replace(/\]([^\s.,;:!?，。；：！？])/g, '] $1');
    const parts = normalized.split(/(\[(?:K_[A-Za-z0-9]+_\d+|Doc_\d+)\])/g);

    return parts.map((part, index) => {
      const citationMatch = part.match(/^\[((?:K_[A-Za-z0-9]+_\d+)|(?:Doc_\d+))\]$/);
      if (!citationMatch) return <span key={index}>{part}</span>;

      const docId = citationMatch[1];
      let targetDocId = docId;
      let citationIndex = Array.isArray(message.citations)
        ? message.citations.findIndex((item) => item.doc_id === docId)
        : -1;
      let sourceTitle = citationIndex >= 0 ? message.citations?.[citationIndex]?.doc_source : undefined;

      // Compatibility for answers created before the backend translated
      // prompt-facing [Doc_N] aliases into stable chunk IDs.
      const legacyMatch = docId.match(/^Doc_(\d+)$/);
      if (legacyMatch && Array.isArray(message.retrievedDocs)) {
        const legacyIndex = Number(legacyMatch[1]) - 1;
        const matchedResult = message.retrievedDocs[legacyIndex];
        if (matchedResult) {
          targetDocId = matchedResult.doc.id;
          const verifiedIndex = Array.isArray(message.citations)
            ? message.citations.findIndex((item) => item.doc_id === targetDocId)
            : -1;
          citationIndex = verifiedIndex >= 0 ? verifiedIndex : legacyIndex;
          sourceTitle = matchedResult.doc.source;
        }
      }
      if (citationIndex < 0) {
        return (
          <span key={index} className="unverified-citation" title={`${part} 超出本次检索来源范围`}>
            引用未验证
          </span>
        );
      }

      return (
        <button
          key={index}
          className="citation-chip"
          type="button"
          onClick={() => onCitationClick(targetDocId)}
          title={sourceTitle}
        >
          来源 {citationIndex + 1}
        </button>
      );
    });
  };

  const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
  const formattedTime = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="message-row user-row">
        <div className="user-message">
          <div className="message-text">{safeContent}</div>
          <time>{formattedTime}</time>
        </div>
      </div>
    );
  }

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(safeContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="message-row assistant-row">
      <div className={`assistant-avatar ${message.status === 'error' ? 'error' : ''}`}>
        {message.status === 'error' ? '!' : '知'}
      </div>
      <article className={`assistant-message ${message.status === 'error' ? 'error-message' : ''}`}>
        <header>
          <div>
            <strong>{message.status === 'error' ? '请求未完成' : '知源助手'}</strong>
            {message.status !== 'error' && <span>基于知识库回答</span>}
          </div>
        </header>
        <div className="assistant-body">{renderContent(safeContent)}</div>
        <footer>
          <time>{formattedTime}</time>
          {message.status !== 'error' && (
            <button type="button" onClick={copyAnswer}>
              {copied ? '已复制' : '复制回答'}
            </button>
          )}
          {message.status === 'error' && (
            <div className="error-actions">
              <button type="button" onClick={onConfigureApi}>更新 API 配置</button>
              <button className="retry-button" type="button" onClick={onRetry} disabled={isLoading || !message.retryQuery}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 11.7 2.6L20 14M4 10l2.8-3.6A7 7 0 0 1 18.5 9" />
                </svg>
                重试
              </button>
            </div>
          )}
        </footer>
      </article>
    </div>
  );
}
