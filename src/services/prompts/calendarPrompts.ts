import { locationService } from '../location/locationService';

interface PromptContext {
  userTimezone: string;
  userCity?: string;
  currentTime: Date;
}

export interface ParsedIntent {
  action: 'create' | 'modify' | 'view' | 'delete' | 'check_availability';
  confidence: number;
  parameters: {
    dateTime?: {
      start: Date;
      end?: Date;
      isAllDay?: boolean;
    };
    title?: string;
    guests?: string[];
    description?: string;
    location?: string;
    recurrence?: string;
  };
  missingInfo: string[];
}

export class CalendarPromptService {
  private async getContext(): Promise<PromptContext> {
    const location = await locationService.getCurrentLocation();
    return {
      userTimezone: location.timezone,
      userCity: location.city,
      currentTime: new Date()
    };
  }

  async generatePrompt(userInput: string): Promise<string> {
    const context = await this.getContext();
    
    return `You are an AI assistant helping with calendar management. 
Current context:
- User's timezone: ${context.userTimezone}
- Local time: ${context.currentTime.toLocaleString('en-US', { timeZone: context.userTimezone })}
${context.userCity ? `- Location: ${context.userCity}` : ''}

Analyze the following calendar-related request and provide a JSON response with these fields:
{
  "action": "create|modify|view|delete|check_availability",
  "confidence": 0.0 to 1.0,
  "parameters": {
    "dateTime": {
      "start": "ISO string with timezone",
      "end": "ISO string with timezone",
      "isAllDay": boolean
    },
    "title": "string",
    "guests": ["email addresses"],
    "description": "string",
    "location": "string",
    "recurrence": "RRULE string"
  },
  "missingInfo": ["list of required fields that are missing"]
}

Consider these rules:
1. Times should be interpreted in the user's timezone (${context.userTimezone})
2. For relative times like "tomorrow", use ${context.currentTime.toISOString()} as reference
3. Default meeting duration is 1 hour unless specified
4. If time is ambiguous, ask for clarification
5. Detect recurring patterns (daily, weekly, monthly)
6. Extract guest emails if provided
7. Confidence should be lower if any ambiguity exists

User request: "${userInput}"`;
  }

  generateFollowUpQuestion(parsedIntent: ParsedIntent): string {
    if (parsedIntent.missingInfo.length === 0) {
      return '';
    }

    const missingField = parsedIntent.missingInfo[0];
    switch (missingField) {
      case 'title':
        return "What would you like to title this event?";
      
      case 'dateTime':
        return "When would you like to schedule this event?";
      
      case 'duration':
        return "How long should the event last?";
      
      case 'guests':
        return "Would you like to add any guests to this event? Please provide their email addresses, or say 'no guests'.";
      
      case 'description':
        return "Would you like to add a description to the event? If not, say 'no description'.";
      
      case 'location':
        return "Where will this event take place? If it's virtual, say 'virtual' or provide a meeting link.";
      
      case 'recurrence':
        return "Should this be a recurring event? If so, please specify the pattern (daily, weekly, monthly).";
      
      default:
        return `Please provide the ${missingField} for the event.`;
    }
  }

  generateConfirmation(parsedIntent: ParsedIntent): string {
    const context = {
      action: parsedIntent.action,
      what: parsedIntent.parameters.title,
      when: parsedIntent.parameters.dateTime?.start 
        ? locationService.formatDateToLocalTime(parsedIntent.parameters.dateTime.start)
        : undefined,
      duration: parsedIntent.parameters.dateTime?.end 
        ? this.calculateDuration(parsedIntent.parameters.dateTime.start, parsedIntent.parameters.dateTime.end)
        : "1 hour",
      who: parsedIntent.parameters.guests?.join(', '),
      where: parsedIntent.parameters.location,
      recurring: parsedIntent.parameters.recurrence
    };

    return `I understand you want to ${context.action} an event:
${context.what ? `Title: ${context.what}` : ''}
${context.when ? `Time: ${context.when}` : ''}
${context.duration ? `Duration: ${context.duration}` : ''}
${context.who ? `Guests: ${context.who}` : ''}
${context.where ? `Location: ${context.where}` : ''}
${context.recurring ? `Recurring: ${context.recurring}` : ''}

Is this correct?`;
  }

  private calculateDuration(start: Date, end: Date): string {
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minutes`;
    }
  }
}

export const calendarPromptService = new CalendarPromptService(); 