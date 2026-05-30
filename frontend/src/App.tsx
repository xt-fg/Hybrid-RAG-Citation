import { useState, useRef, useEffect } from 'react';
import type { Message, Citation, SearchResult } from './types';
import { queryDocuments } from './services/api';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ReferencePanel } from './components/ReferencePanel';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [currentDocs, setCurrentDocs] = useState<SearchResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call API
      const response = await queryDocuments({
        query: content,
        top_k: 5,
      });

      // Update citations and docs
      setCurrentCitations(response.citations);
      setCurrentDocs(response.retrieved_docs);

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        retrievedDocs: response.retrieved_docs,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，处理您的问题时出现了错误：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (docId: string) => {
    setHighlightedDocId(docId);
    
    // Scroll to document in reference panel
    const docElement = document.getElementById(`doc-${docId}`);
    if (docElement) {
      docElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Remove highlight after 2 seconds
    setTimeout(() => setHighlightedDocId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left: Chat Panel */}
      <div className="flex-1 flex flex-col bg-white shadow-lg min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Hybrid RAG 智能问答</h1>
              <p className="text-xs text-gray-500">基于混合检索与 RRF 重排的文档问答系统</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 overflow-x-hidden">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-500 mb-2">开始对话</p>
              <p className="text-sm text-center max-w-md">
                试试问我关于 Transformer 架构、RAG 系统、或 RRF 算法的问题
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {['什么是 RRF 算法？', '比较 BM25 和向量检索', 'RAG 系统如何生成引用？'].map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSend(question)}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[700px] mx-auto">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={handleCitationClick}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>

      {/* Right: Reference Panel */}
      <div className="w-[380px] flex-shrink-0 border-l border-gray-200 bg-gray-50 overflow-hidden">
        <ReferencePanel
          citations={currentCitations}
          retrievedDocs={currentDocs}
          highlightedDocId={highlightedDocId}
        />
      </div>
    </div>
  );
}

export default App;
