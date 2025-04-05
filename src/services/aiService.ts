import CalendarCommands, { CalendarCommand } from './calendarCommands';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIServiceConfig {
  apiKey: string;
  model: 'gemini' | 'gpt-3.5-turbo' | 'gpt-4';
}

class AIService {
  private apiKey: string;
  private model: string;

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async sendMessage(message: string, context?: ChatMessage[]): Promise<string> {
    try {
      // Check if this is a calendar command
      if (CalendarCommands.isCalendarCommand(message)) {
        const command = CalendarCommands.parseCommand(message);
        if (command) {
          return this.handleCalendarCommand(command);
        }
      }

      // Otherwise, use the AI model
      if (this.model.startsWith('gpt')) {
        return await this.sendOpenAIMessage(message, context);
      } else {
        return await this.sendGeminiMessage(message, context);
      }
    } catch (error) {
      console.error('Error in AI response:', error);
      throw error;
    }
  }

  private async sendOpenAIMessage(message: string, context?: ChatMessage[]): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [
      ...(context || []),
      { role: 'user', content: message }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async sendGeminiMessage(message: string, context?: ChatMessage[]): Promise<string> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // Convert chat context to Gemini format with correct roles
    const contents = [
      ...(context || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    const response = await fetch(`${url}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  private async handleCalendarCommand(command: CalendarCommand): Promise<string> {
    switch (command.type) {
      case 'create':
        return `I'll help you create a calendar event. Title: ${command.details.title || 'Untitled'}, Time: ${command.details.startTime?.toLocaleString() || 'TBD'}`;
      case 'view':
        return "I'll show you your upcoming events. Would you like to see today's schedule or a specific date?";
      case 'modify':
        return "I'll help you modify your event. Please provide the event details you'd like to change.";
      case 'delete':
        return "I'll help you cancel your event. Please confirm which event you'd like to delete.";
      case 'check_availability':
        return "I'll check your availability. For what time period would you like to check?";
      default:
        return "I understand you want to do something with your calendar. Could you please provide more details?";
    }
  }
}

// Create and export the service with environment variables
export const aiService = new AIService({
  apiKey: import.meta.env.VITE_AI_API_KEY,
  model: import.meta.env.VITE_AI_MODEL || 'gemini'
}); 