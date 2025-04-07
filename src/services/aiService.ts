import CalendarCommands, { CalendarCommand } from './calendarCommands';
import { aiEventHandler } from './calendar/aiEventHandler';
import { taskHandler } from './calendar/taskHandler';
import { getTimeInfo, TimeInfo } from './timeUtils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIServiceConfig {
  apiKey: string;
}

export class AIService {
  private apiKey: string;
  private timeInfo: TimeInfo = getTimeInfo();

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
    this.updateTimeInfo();
  }

  private updateTimeInfo(): void {
    this.timeInfo = getTimeInfo();
  }

  private isTaskRequest(message: string): boolean {
    const taskKeywords = [
      'create task',
      'add task',
      'set task',
      'make task',
      'new task',
    ];
    return taskKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  async sendMessage(message: string, context?: ChatMessage[]): Promise<string> {
    this.updateTimeInfo();
    try {
      // Check if the message is about creating a task
      if (this.isTaskRequest(message)) {
        return await taskHandler.handleTaskCreation(message);
      }

      // Check if the message is about creating a calendar event
      if (this.isCalendarRequest(message)) {
        return this.handleCalendarRequest(message);
      }

      // Check if this is a calendar command
      if (CalendarCommands.isCalendarCommand(message)) {
        const command = CalendarCommands.parseCommand(message);
        if (command) {
          return this.handleCalendarCommand(command);
        }
      }

      // Use Gemini AI for response
      return await this.sendGeminiMessage(message, context);
    } catch (error) {
      console.error('Error in AI service:', error);
      throw error;
    }
  }

  private async sendGeminiMessage(message: string, context?: ChatMessage[]): Promise<string> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // Add system prompt for Gemini
    const systemPrompt = {
      role: 'model',
      parts: [{
        text: `You are TimeBridge AI, an advanced AI assistant with special calendar management capabilities. 
        You can help users with general questions and tasks, but you specialize in:
        1. Creating and managing calendar events
        2. Creating and managing tasks
        3. Scheduling meetings and appointments
        4. Checking availability
        5. Managing calendar conflicts

        For tasks, you can:
        - Create new tasks with title, date, time, and description
        - Help users organize their to-do lists
        - Set reminders for important tasks

        Current time context:
        - Timezone: ${this.timeInfo.timezone}
        - Current Time: ${this.timeInfo.currentTime}
        - Current Date: ${this.timeInfo.currentDate}
        - UTC Offset: ${this.timeInfo.offset}

        Always use this timezone information when discussing times and dates with users.
        Always mention your calendar and task management capabilities when users ask about your abilities.
        
        For task creation, guide users to provide:
        1. Task title (required)
        2. Due date (recommended)
        3. Time (optional)
        4. Description (optional)`
      }]
    };
    
    // Convert chat context to Gemini format with correct roles
    const contents = [
      systemPrompt,
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

  private isCalendarRequest(message: string): boolean {
    const calendarKeywords = [
      'create event',
      'schedule',
      'appointment',
      'meeting',
      'add to calendar',
      'book time',
    ];
    return calendarKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private async handleCalendarRequest(message: string): Promise<string> {
    return aiEventHandler.handleEventCreation(message);
  }
}

// Create and export the service with environment variables
export const aiService = new AIService({
  apiKey: import.meta.env.VITE_AI_API_KEY
}); 