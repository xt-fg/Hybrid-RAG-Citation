import type { Citation, SearchResult } from '../types';

interface ReferencePanelProps {
  citations: Citation[];
  retrievedDocs: SearchResult[];
  highlightedDocId: string | null;
}

export function ReferencePanel({ citations, retrievedDocs, highlightedDocId }: ReferencePanelProps) {
  if (!citations || citations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
        <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium">提问后，这里将显示</p>
        <p className="text-sm">检索到的参考文档</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-white" style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          参考文档
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          共检索到 {retrievedDocs.length} 个相关文档片段
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px', background: '#f9fafb' }}>
        {retrievedDocs.map((result) => {
          const isHighlighted = highlightedDocId === result.doc.id;
          const citation = citations.find(c => c.doc_id === result.doc.id);
          
          return (
            <div
              key={result.doc.id}
              id={`doc-${result.doc.id}`}
              style={{
                background: isHighlighted ? '#f5f3ff' : '#f8f9fa',
                border: isHighlighted ? '2px solid #a78bfa' : '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px',
                boxShadow: isHighlighted ? '0 0 0 3px rgba(167,139,250,0.2)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <div className="flex items-center gap-2">
                  <span style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    borderRadius: '4px',
                  }}>
                    [{result.doc.id}]
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    {result.doc.source}{result.doc.page ? ` · p${result.doc.page}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>#{result.rank}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>{(result.score * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              {/* Content */}
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }} className="line-clamp-4">
                {citation?.snippet || result.doc.content}
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5" style={{ marginTop: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 500,
                  background: '#e5e7eb',
                  color: '#4b5563',
                }}>
                  {result.source_type.toUpperCase()}
                </span>
                {result.doc.chunk_type && (
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 500,
                    background: result.doc.chunk_type === 'table' ? '#dcfce7' : '#dbeafe',
                    color: result.doc.chunk_type === 'table' ? '#15803d' : '#1d4ed8',
                  }}>
                    {result.doc.chunk_type === 'table' ? '📊 表格' : '📄 文本'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
