'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function ChatWindow() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content }]);
    setLoading(true);

    try {
      // API call logic here
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (!data.message) {
        throw new Error('Invalid response format');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <Message 
              key={index}
              content={message.content} 
              role={message.role}
            />
          ))}
          {loading && (
            <div className="px-4 py-6">
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-white font-bold">
                  T
                </div>
                <div className="flex items-center bg-gray-800/50 px-6 py-4 rounded-2xl">
                  <LoadingSpinner />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent pt-20 pb-8">
        <div className="max-w-3xl mx-auto px-4">
          <MessageInput onSendMessage={handleSendMessage} disabled={loading} />
          <p className="text-xs text-center text-gray-400 mt-2">
            TimeBridgeAI can make mistakes. Consider checking important info.
          </p>
        </div>
      </div>
    </div>
  );
}