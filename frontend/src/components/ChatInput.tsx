import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const hasContent = input.trim().length > 0;

  return (
    <div className="flex-shrink-0" style={{ padding: '12px 20px 16px 20px' }}>
      <div style={{
        maxWidth: '780px',
        margin: '0 auto',
        borderRadius: '24px',
        background: '#ffffff',
        border: `1px solid ${isFocused ? '#8b5cf6' : '#e5e7eb'}`,
        boxShadow: isFocused
          ? '0 4px 16px rgba(139,92,246,0.12), 0 0 0 3px rgba(139,92,246,0.08)'
          : '0 4px 12px rgba(0,0,0,0.05)',
        padding: '12px 16px',
        transition: 'all 0.2s ease',
      }}>
        {/* Input area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="输入你的问题..."
          rows={1}
          disabled={isLoading}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '15px',
            lineHeight: '1.5',
            color: '#1f2937',
            resize: 'none',
            minHeight: '24px',
            maxHeight: '200px',
            padding: '0',
            fontFamily: 'inherit',
          }}
        />

        {/* Bottom toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '8px',
        }}>
          {/* Left: Add button */}
          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #e5e7eb',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              color: '#6b7280',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Right: Model selector + Send button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Model selector placeholder */}
            <button style={{
              fontSize: '12px',
              color: '#6b7280',
              background: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              <span>GPT-4o</span>
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!hasContent || isLoading}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: (!hasContent || isLoading)
                  ? '#d1d5db'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                cursor: (!hasContent || isLoading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (hasContent && !isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (hasContent && !isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {isLoading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
