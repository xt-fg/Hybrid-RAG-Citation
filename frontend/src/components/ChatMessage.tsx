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
      .replace(/\]([^\s.,;:!?])/g, '] $1')
      .replace(/\](\s)/g, '] $1');
    const parts = normalized.split(/(\[Doc_\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[Doc_(\d+)\]/);
      if (citationMatch) {
        const docId = `Doc_${citationMatch[1]}`;
        return (
          <button
            key={index}
            onClick={() => onCitationClick(docId)}
            style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              padding: '3px 8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#7c3aed',
              backgroundColor: '#ede9fe',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: '1.2',
              marginLeft: '4px',
              marginRight: '4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ddd6fe';
              e.currentTarget.style.color = '#6d28d9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ede9fe';
              e.currentTarget.style.color = '#7c3aed';
            }}
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
        <div style={{
          maxWidth: '75%',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          padding: '14px 18px',
          boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
        }}>
          <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6', fontSize: '15px' }}>
            {message.content}
          </div>
          <div style={{ marginTop: '6px', textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: 'rgba(191,219,254,0.8)' }}>
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" style={{ marginBottom: '24px' }}>
      {/* Avatar */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginRight: '12px',
        marginTop: '16px',
        boxShadow: '0 2px 6px rgba(139,92,246,0.3)',
      }}>
        <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>AI</span>
      </div>
      {/* Card */}
      <div style={{
        flex: 1,
        maxWidth: 'calc(100% - 48px)',
        borderRadius: '16px',
        background: 'white',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px 10px 18px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#374151' }}>Hybrid RAG Assistant</span>
        </div>
        {/* Body */}
        <div style={{
          padding: '14px 18px',
          fontSize: '15px',
          color: '#1f2937',
          lineHeight: '1.7',
        }}>
          {renderContent(message.content)}
        </div>
        {/* Footer */}
        <div style={{ padding: '4px 18px 12px 18px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
