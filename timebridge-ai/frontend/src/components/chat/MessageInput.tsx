'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) {
        handleSend();
      }
    }
  };

  // Keep focus on the textarea when component mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex gap-2 p-4 border-t border-gray-800">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        autoFocus
        placeholder="Type your message..."
        className="flex-1 bg-gray-800 rounded-xl p-3 resize-none h-[50px] 
                 focus:outline-none focus:ring-2 focus:ring-primary/50"
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="px-4 py-2 bg-primary rounded-xl font-medium
                 hover:bg-primary-dark transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}