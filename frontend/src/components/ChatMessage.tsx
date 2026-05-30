import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onCitationClick: (docId: string) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Parse citations in the message content
  const renderContent = (content: string) => {
    // Normalize content: add space before/after [Doc_X] if missing
    const normalized = content
      .replace(/([^\s])\[/g, '$1 [')
      .replace(/\]([^\s.,;:!?])/g, '] $1');
    
    const parts = normalized.split(/(\[Doc_\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[Doc_(\d+)\]/);
      if (citationMatch) {
        const docId = `Doc_${citationMatch[1]}`;
        return (
          <button
            key={index}
            onClick={() => onCitationClick(docId)}
            className="inline-block px-2 py-0.5 mx-0.5 text-xs font-bold text-white bg-purple-500 rounded-full hover:bg-purple-600 transition-all cursor-pointer shadow-sm align-middle leading-normal"
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
      <div className="flex justify-end mb-6 mt-5">
        <div className="max-w-[85%] rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-4 shadow-md">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          <div className="mt-2 text-right">
            <span className="text-xs text-blue-200">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Hybrid RAG Assistant</span>
        </div>
        {/* Body */}
        <div className="px-6 py-5 text-sm text-gray-800 leading-[1.7]">
          {renderContent(message.content)}
        </div>
        {/* Footer */}
        <div className="px-6 pb-4 pt-2">
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
