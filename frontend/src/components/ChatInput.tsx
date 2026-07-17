import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
  isUploading: boolean;
  documentCount: number;
}

export function ChatInput({
  onSend,
  onUpload,
  isLoading,
  isUploading,
  documentCount,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAsk = documentCount > 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 24), 180)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isLoading && canAsk) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await onUpload(file);
    event.target.value = '';
  };

  const hasContent = input.trim().length > 0;
  const disabled = !hasContent || isLoading || !canAsk;

  return (
    <div className="chat-composer-wrap">
      <div className={`chat-composer ${isFocused ? 'is-focused' : ''}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={canAsk ? '基于当前知识库提问…' : '请先上传一份文档'}
          rows={1}
          disabled={isLoading || !canAsk}
          aria-label="输入问题"
        />

        <div className="composer-toolbar">
          <div className="composer-tools">
            <input
              id="knowledge-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              onChange={handleFileChange}
              hidden
            />
            <button
              className="icon-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="上传文档"
              aria-label="上传文档"
            >
              {isUploading ? (
                <span className="spinner dark" />
              ) : (
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m-7-7h14" />
                </svg>
              )}
            </button>
            <span className="composer-hint">
              {canAsk ? `${documentCount} 份文档已就绪` : '支持 PDF、TXT、Markdown'}
            </span>
          </div>

          <div className="composer-actions">
            <span className="keyboard-hint">Enter 发送</span>
            <button
              className="send-button"
              type="button"
              onClick={handleSend}
              disabled={disabled}
              aria-label="发送问题"
            >
              {isLoading ? (
                <span className="spinner" />
              ) : (
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      <p className="composer-disclaimer">回答由模型生成，请通过引用原文核验重要信息</p>
    </div>
  );
}
