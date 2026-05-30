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
      <div className="px-5 py-4 border-b border-gray-200 bg-white flex-shrink-0">
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/50">
        {retrievedDocs.map((result) => {
          const isHighlighted = highlightedDocId === result.doc.id;
          const citation = citations.find(c => c.doc_id === result.doc.id);
          
          return (
            <div
              key={result.doc.id}
              id={`doc-${result.doc.id}`}
              className={`rounded-lg p-3 transition-all duration-300 ${
                isHighlighted
                  ? 'border-2 border-purple-400 bg-purple-50 shadow-lg ring-2 ring-purple-200'
                  : 'border border-gray-200 bg-[#f8f9fa] shadow-sm hover:shadow-md'
              }`}
            >
              {/* Card Header: file info + rank */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded">
                    [{result.doc.id}]
                  </span>
                  <span className="text-xs text-gray-500 font-medium truncate max-w-[120px]">
                    {result.doc.source}
                    {result.doc.page && ` · p${result.doc.page}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-500">#{result.rank}</span>
                  <span className="text-xs font-semibold text-purple-600">{(result.score * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              {/* Content preview */}
              <div className="text-xs text-gray-600 leading-[1.5] line-clamp-3">
                {citation?.snippet || result.doc.content}
              </div>
              
              {/* Tags */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium" style={{fontSize: '12px', padding: '2px 6px', borderRadius: '4px'}}>
                  {result.source_type.toUpperCase()}
                </span>
                {result.doc.chunk_type && (
                  <span className={`text-xs font-medium ${result.doc.chunk_type === 'table' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`} style={{fontSize: '12px', padding: '2px 6px', borderRadius: '4px', fontWeight: 500}}>
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
