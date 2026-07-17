import type { Citation, SearchResult } from '../types';

interface ReferencePanelProps {
  citations: Citation[];
  retrievedDocs: SearchResult[];
  highlightedDocId: string | null;
  onClose?: () => void;
}

export function ReferencePanel({ citations, retrievedDocs, highlightedDocId, onClose }: ReferencePanelProps) {
  const safeCitations = Array.isArray(citations) ? citations : [];
  const safeRetrievedDocs = Array.isArray(retrievedDocs) ? retrievedDocs : [];

  if (safeRetrievedDocs.length === 0) {
    return (
      <div className="sources-empty">
        <div className="sources-empty-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h4" />
          </svg>
        </div>
        <strong>引用来源</strong>
        <p>完成一次提问后，这里会展示回答所依据的原文片段。</p>
      </div>
    );
  }

  const retrievedById = new Map(
    safeRetrievedDocs.map((result) => [result.doc.id, result]),
  );
  const visibleDocs = safeCitations.length > 0
    ? safeCitations.flatMap((citation) => {
        const result = retrievedById.get(citation.doc_id);
        return result ? [result] : [];
      })
    : safeRetrievedDocs;

  return (
    <div className="sources-panel">
      <header className="sources-header">
        <div>
          <span className="eyebrow">EVIDENCE</span>
          <h2>引用来源</h2>
        </div>
        <span className="source-count">{visibleDocs.length}</span>
        <button className="sources-close" type="button" onClick={onClose} aria-label="关闭引用来源">×</button>
      </header>
      <p className="sources-summary">
        {safeCitations.length > 0
          ? `回答实际引用了 ${visibleDocs.length} 个原文片段`
          : `模型未生成有效引用，以下为检索到的 ${visibleDocs.length} 个相关片段`}
      </p>

      <div className="sources-list">
        {visibleDocs.map((result, index) => {
          const citation = safeCitations.find((item) => item.doc_id === result.doc.id);
          const isHighlighted = highlightedDocId === result.doc.id;
          const sourceDocumentId = typeof result.doc.metadata?.document_id === 'string'
            ? result.doc.metadata.document_id
            : null;
          return (
            <article
              key={result.doc.id}
              id={`doc-${result.doc.id}`}
              className={`source-card ${isHighlighted ? 'is-highlighted' : ''}`}
            >
              <div className="source-card-topline">
                <span className="source-number">来源 {index + 1}</span>
                <span className="source-rank">检索排名 #{result.rank}</span>
              </div>
              <h3 title={result.doc.source}>{result.doc.source}</h3>
              <div className="source-meta">
                {result.doc.page && <span>第 {result.doc.page} 页</span>}
                <span>{result.doc.chunk_type === 'table' ? '表格' : '正文'}</span>
                <span>{result.source_type === 'rrf' ? '混合检索' : '关键词检索'}</span>
              </div>
              <blockquote>{citation?.snippet || result.doc.content}</blockquote>
              {sourceDocumentId && (
                <a
                  className="source-link"
                  href={`/api/documents/${sourceDocumentId}/file${result.doc.page ? `#page=${result.doc.page}` : ''}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开原始文件{result.doc.page ? ` · 第 ${result.doc.page} 页` : ''} ↗
                </a>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
