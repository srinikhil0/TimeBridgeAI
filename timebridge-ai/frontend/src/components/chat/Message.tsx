'use client';

interface MessageProps {
  content: string;
  displayContent?: string;
  isAI: boolean;
  timestamp: Date;
}

export function Message({ content, displayContent, isAI, timestamp }: MessageProps) {
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[80%] p-4 rounded-2xl ${
          isAI 
            ? 'bg-gray-800/50 text-white/90' 
            : 'bg-indigo-500/20 backdrop-blur-sm text-white'
        }`}
      >
        <p className="whitespace-pre-wrap">{displayContent || content}</p>
        <time className="text-xs text-gray-400 mt-2 block">
          {timestamp.toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}