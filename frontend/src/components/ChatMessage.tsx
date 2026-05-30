import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onCitationClick: (docId: string) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Parse citations in the message content
  const renderContent = (content: string) => {
    const parts = content.split(/(\[Doc_\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[Doc_(\d+)\]/);
      if (citationMatch) {
        const docId = `Doc_${citationMatch[1]}`;
        return (
          <button
            key={index}
            onClick={() => onCitationClick(docId)}
            className="inline-flex items-center px-2 py-0.5 mx-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200 transition-all cursor-pointer shadow-sm hover:shadow"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-xs font-medium text-gray-500">Hybrid RAG Assistant</span>
          </div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{whiteSpace: 'pre-wrap'}}>
          {isUser ? message.content : renderContent(message.content)}
        </div>
        <div className={`text-xs mt-2 pt-2 border-t ${isUser ? 'border-blue-400 text-blue-200' : 'border-gray-100 text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
