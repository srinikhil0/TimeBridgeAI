'use client';

import { useState, useEffect } from 'react';

interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
}

export function Message({ content, role }: MessageProps) {
  const [displayText, setDisplayText] = useState('');
  const isAI = role === 'assistant';
  
  useEffect(() => {
    if (!isAI) {
      setDisplayText(content);
      return;
    }

    const baseSpeed = 30;
    const speed = Math.max(10, baseSpeed - (content.length / 100));
    let index = 0;

    const timer = setInterval(() => {
      setDisplayText(content.slice(0, index));
      index++;
      
      if (index > content.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, isAI]);

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} w-full px-4 py-2`}>
      <div className={`flex gap-4 ${!isAI && 'flex-row-reverse'} ${isAI ? 'max-w-[80%]' : 'max-w-[70%]'}`}>
        {isAI && (
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-white font-bold">
            T
          </div>
        )}
        <div 
          className={`overflow-hidden ${
            isAI ? 'bg-gray-800/50 text-gray-200' : 'bg-primary/10 text-white'
          } px-4 py-3 rounded-2xl`}
        >
          <div className="whitespace-pre-wrap break-words">{displayText}</div>
        </div>
      </div>
    </div>
  );
}