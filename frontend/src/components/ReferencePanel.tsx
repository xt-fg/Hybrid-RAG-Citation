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
        <p className="text-center text-sm font-medium">
          提问后，这里将显示
        </p>
        <p className="text-center text-sm">
          检索到的参考文档
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          参考文档
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          共检索到 {retrievedDocs.length} 个相关文档片段
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {retrievedDocs.map((result, index) => {
          const isHighlighted = highlightedDocId === result.doc.id;
          const citation = citations.find(c => c.doc_id === result.doc.id);
          
          return (
            <div
              key={result.doc.id}
              id={`doc-${result.doc.id}`}
              className={`rounded-xl border p-4 transition-all duration-300 ${
                isHighlighted
                  ? 'border-purple-400 bg-purple-50 shadow-lg ring-2 ring-purple-200'
                  : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg shadow-sm">
                    [{result.doc.id}]
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Rank #{result.rank}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {result.source_type.toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-purple-600">
                    {(result.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{result.doc.source}</span>
                {result.doc.page && <span className="text-gray-400">· 第{result.doc.page}页</span>}
              </div>
              
              <div className="text-xs text-gray-600 leading-[1.7] line-clamp-4 bg-gray-50 rounded-lg p-3">
                {citation?.snippet || result.doc.content}
              </div>
              
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.doc.chunk_type && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    result.doc.chunk_type === 'table' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
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
