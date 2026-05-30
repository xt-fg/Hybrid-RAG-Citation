import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onCitationClick: (docId: string) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Parse citations in the message content
  const renderContent = (content: string) => {
    // Add space before [Doc_X] if missing
    const normalizedContent = content.replace(/([^\s])\[/g, '$1 [');
    const parts = normalizedContent.split(/(\[Doc_\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[Doc_(\d+)\]/);
      if (citationMatch) {
        const docId = `Doc_${citationMatch[1]}`;
        return (
          <button
            key={index}
            onClick={() => onCitationClick(docId)}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs font-bold text-white bg-purple-500 rounded-full hover:bg-purple-600 transition-all cursor-pointer shadow-sm align-middle"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`max-w-[85%] rounded-2xl ${
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-4 shadow-md'
            : 'bg-white border border-gray-100 text-gray-800 shadow-sm'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-sm font-medium text-gray-600">Hybrid RAG Assistant</span>
          </div>
        )}
        <div className={`text-sm leading-[1.8] ${isUser ? '' : 'px-5 py-4'}`}>
          {isUser ? message.content : renderContent(message.content)}
        </div>
        <div className={`${isUser ? 'mt-2 text-right' : 'px-5 pb-4 pt-1 border-t border-gray-50'}`}>
          <span className={`text-xs ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
