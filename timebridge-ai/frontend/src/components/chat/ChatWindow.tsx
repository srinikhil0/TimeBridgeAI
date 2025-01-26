'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ChevronDown } from 'lucide-react';
import { CollapsibleCalendar } from '../calendar/CollapsibleCalendar';

interface ChatMessage {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
  displayContent?: string; // For typewriter effect
}

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{
    id: 'welcome',
    content: "👋 Hello! I'm your AI calendar assistant. I can help you:\n\n• Schedule meetings and events\n• Manage your calendar\n• Set reminders\n• Coordinate with others\n\nHow can I assist you today?",
    displayContent: "👋 Hello! I'm your AI calendar assistant. I can help you:\n\n• Schedule meetings and events\n• Manage your calendar\n• Set reminders\n• Coordinate with others\n\nHow can I assist you today?",
    isAI: true,
    timestamp: new Date()
  }]);
  const [loading, setLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Auto-scroll on new messages or loading state change
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Add scroll event listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const calculateTypingSpeed = (content: string): number => {
    const length = content.length;
    // Base speed in milliseconds
    if (length < 20) return 30; // Faster for very short messages
    if (length < 50) return 25;
    if (length < 100) return 20;
    return 10; // Fast for long messages
  };

  const typeMessage = async (message: ChatMessage) => {
    const speed = calculateTypingSpeed(message.content);
    let currentText = "";
    
    for (let i = 0; i < message.content.length; i++) {
      currentText += message.content[i];
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, displayContent: currentText }
          : msg
      ));
      await new Promise(resolve => setTimeout(resolve, speed));
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      displayContent: content, // User messages show immediately
      isAI: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm your AI calendar assistant. I'll help you manage your schedule!",
        displayContent: "", // Start empty for typewriter effect
        isAI: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      await typeMessage(aiMessage);
    } catch (error) {
      console.error('Failed to get AI response:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] glass-effect rounded-xl my-4 relative">
      <div 
        ref={chatContainerRef}
        className="absolute inset-0 overflow-y-auto p-6 space-y-6 pb-[180px]"
      >
        {messages.map((message) => (
          <div key={message.id} className="w-full">
            <Message
              content={message.displayContent || message.content}
              isAI={message.isAI}
              timestamp={message.timestamp}
            />
            {message.isAI && message.content.includes("schedule") && (
              <div className="mt-4 mb-8">
                <CollapsibleCalendar 
                  isOpen={showCalendar}
                  onToggle={() => setShowCalendar(!showCalendar)}
                  events={[
                    {
                      id: '1',
                      title: 'Arrays and Strings',
                      start: new Date(2024, 2, 20, 8, 0),
                      end: new Date(2024, 2, 20, 9, 30),
                      description: 'Study session'
                    }
                  ]}
                />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/50 p-4 rounded-2xl">
              <LoadingSpinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <div className="absolute bottom-[90px] left-0 right-0 flex justify-center">
          <button
            onClick={scrollToBottom}
            className="p-2 rounded-full bg-indigo-500 shadow-lg
                     transition-all duration-300 ease-in-out
                     hover:scale-110"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gray-900">
        <MessageInput onSendMessage={handleSendMessage} disabled={loading} />
      </div>
    </div>
  );
}