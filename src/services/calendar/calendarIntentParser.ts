import { ParsedIntent } from '../prompts/calendarPrompts';

interface TimeSlot {
  start: Date;
  end: Date;
}

interface CalendarParameters {
  dateTime?: {
    start: Date;
    end: Date;
  };
  title?: string;
  description?: string;
  guests?: string[];
  location?: string;
  recurrence?: string;
}

export interface CalendarIntent extends Omit<ParsedIntent, 'parameters'> {
  parameters: CalendarParameters;
  calendarId?: string;
  meetingLink?: string;
  attendeeResponses?: Array<{
    email: string;
    response: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
}

interface GeminiResponse {
  action: string;
  dateTime?: {
    start: string; // ISO string
    end?: string;  // ISO string
    duration?: number; // in minutes
  };
  title?: string;
  guests?: string[];
  description?: string;
  recurrence?: string;
  location?: string;
  confidence: number;
}

export class CalendarIntentParser {
  private readonly GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  async parseIntent(prompt: string): Promise<CalendarIntent | null> {
    try {
      const response = await fetch(`${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.1,
            topK: 16,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to parse intent with Gemini AI');
      }

      const data = await response.json();
      const rawResponse = JSON.parse(data.candidates[0].content.parts[0].text);
      
      // Convert ISO strings to Date objects
      if (rawResponse.parameters?.dateTime?.start) {
        rawResponse.parameters.dateTime.start = new Date(rawResponse.parameters.dateTime.start);
      }
      if (rawResponse.parameters?.dateTime?.end) {
        rawResponse.parameters.dateTime.end = new Date(rawResponse.parameters.dateTime.end);
      }

      // Ensure the response matches our CalendarIntent interface
      const parsedIntent: CalendarIntent = {
        action: rawResponse.action,
        confidence: rawResponse.confidence,
        parameters: {
          dateTime: rawResponse.parameters?.dateTime ? {
            start: new Date(rawResponse.parameters.dateTime.start),
            end: new Date(rawResponse.parameters.dateTime.end)
          } : undefined,
          title: rawResponse.parameters?.title,
          description: rawResponse.parameters?.description,
          guests: rawResponse.parameters?.guests,
          location: rawResponse.parameters?.location,
          recurrence: rawResponse.parameters?.recurrence
        },
        missingInfo: rawResponse.missingInfo || [],
        calendarId: rawResponse.calendarId,
        meetingLink: rawResponse.meetingLink,
        attendeeResponses: rawResponse.attendeeResponses
      };

      return parsedIntent;
    } catch (error) {
      console.error('Error parsing calendar intent:', error);
      return null;
    }
  }

  private convertToCalendarIntent(response: GeminiResponse): CalendarIntent {
    let dateTime: TimeSlot | undefined;

    if (response.dateTime?.start) {
      const start = new Date(response.dateTime.start);
      let end: Date;

      if (response.dateTime.end) {
        end = new Date(response.dateTime.end);
      } else if (response.dateTime.duration) {
        end = new Date(start.getTime() + response.dateTime.duration * 60000);
      } else {
        end = new Date(start.getTime() + 60 * 60000);
      }

      dateTime = { start, end };
    }

    return {
      action: response.action as CalendarIntent['action'],
      confidence: response.confidence,
      parameters: {
        dateTime,
        title: response.title,
        guests: response.guests,
        description: response.description,
        recurrence: response.recurrence,
        location: response.location
      },
      missingInfo: []
    };
  }
}

export const calendarIntentParser = new CalendarIntentParser(); 