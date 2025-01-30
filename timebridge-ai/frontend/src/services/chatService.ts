import { logger } from '@/utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatContext {
  timestamp?: string;
  previousMessages?: ChatMessage[];
  calendarEvents?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }[];
  [key: string]: unknown;
}

export class ChatService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  async sendMessage(message: string, context?: ChatContext): Promise<ChatMessage> {
    logger.info('Sending message to AI', { message, context });
    
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Received AI response', { response: data });
      
      return {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send message to AI', { error });
      throw error;
    }
  }
} 