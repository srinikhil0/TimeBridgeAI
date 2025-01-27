'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { getFirebaseIdToken } from '@/lib/firebase/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
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

    const newMessage: Message = { role: 'user', content };
    const currentMessages = [...messages, newMessage];
    setMessages(currentMessages);
    setLoading(true);

    try {
      const token = await getFirebaseIdToken();
      if (!token) {
        sessionStorage.setItem('pendingMessages', JSON.stringify(currentMessages));
        window.location.href = '/';
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/api/chat/message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ 
          message: content,
          context: { timestamp: new Date().toISOString() }
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          const newToken = await getFirebaseIdToken(true);
          if (!newToken) {
            throw new Error('Authentication failed');
          }
          const retryResponse = await fetch('http://127.0.0.1:8000/api/chat/message', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`
            },
            credentials: 'include',
            body: JSON.stringify({ 
              message: content,
              context: { timestamp: new Date().toISOString() }
            }),
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          const data = await retryResponse.json();
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.message
          };
          setMessages(prev => [...prev, assistantMessage]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: unknown) {
      console.error('Chat error:', error);
      if (error instanceof Error && error.message === 'Authentication failed') {
        sessionStorage.setItem('pendingMessages', JSON.stringify(currentMessages));
        window.location.href = '/';
        return;
      }
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to restore messages after redirect
  useEffect(() => {
    const pendingMessages = sessionStorage.getItem('pendingMessages');
    if (pendingMessages) {
      setMessages(JSON.parse(pendingMessages));
      sessionStorage.removeItem('pendingMessages');
    }
  }, []);

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