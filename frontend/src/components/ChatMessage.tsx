import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onCitationClick: (docId: string) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const renderContent = (content: string) => {
    // Force space before/after [Doc_X]
    const normalized = content
      .replace(/([^\s])\[/g, '$1 [')
      .replace(/\]([^\s])/g, '] $1');
    const parts = normalized.split(/(\[Doc_\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[Doc_(\d+)\]/);
      if (citationMatch) {
        const docId = `Doc_${citationMatch[1]}`;
        return (
          <button
            key={index}
            onClick={() => onCitationClick(docId)}
            className="inline-block px-2 py-0.5 mx-1 text-xs font-bold text-white bg-purple-500 rounded-full hover:bg-purple-600 transition-all cursor-pointer shadow-sm align-middle"
            style={{ lineHeight: '1.2' }}
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end" style={{ marginTop: '20px', marginBottom: '24px' }}>
        <div className="max-w-[85%] rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
          style={{ padding: '16px 20px' }}
        >
          <div className="text-sm whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
            {message.content}
          </div>
          <div style={{ marginTop: '8px', textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: 'rgba(191,219,254,0.85)' }}>
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" style={{ marginBottom: '24px' }}>
      <div className="max-w-[85%] rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3" style={{ padding: '16px 16px 12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Hybrid RAG Assistant</span>
        </div>
        {/* Body */}
        <div className="text-sm text-gray-800" style={{ padding: '16px', lineHeight: '1.7' }}>
          {renderContent(message.content)}
        </div>
        {/* Footer - timestamp */}
        <div style={{ padding: '0 16px 14px 16px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', display: 'inline-block' }}>
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
