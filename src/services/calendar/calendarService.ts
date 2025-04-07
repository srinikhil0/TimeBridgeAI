import { calendarAuth } from './authUtils';

interface TimeSlot {
  start: Date;
  end: Date;
}

interface GoogleCalendarEventResponse {
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
}

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEvents?: {
    summary: string;
    start: Date;
    end: Date;
  }[];
  suggestedTimes?: TimeSlot[];
}

export class CalendarService {
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

  async checkConflicts(startTime: Date, endTime: Date): Promise<ConflictCheckResult> {
    try {
      const accessToken = await calendarAuth.getAccessToken();
      const response = await fetch(
        `${this.CALENDAR_API_BASE}/calendars/primary/events?timeMin=${startTime.toISOString()}&timeMax=${endTime.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      const events = data.items || [];
      
      const conflicts = events.map((event: GoogleCalendarEventResponse) => ({
        summary: event.summary || 'Untitled Event',
        start: new Date(event.start?.dateTime || event.start?.date || ''),
        end: new Date(event.end?.dateTime || event.end?.date || ''),
      }));

      if (conflicts.length > 0) {
        return {
          hasConflict: true,
          conflictingEvents: conflicts,
          suggestedTimes: this.findAlternativeTimes(startTime, endTime, conflicts),
        };
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('Error checking conflicts:', error);
      throw error;
    }
  }

  private findAlternativeTimes(
    desiredStart: Date,
    desiredEnd: Date,
    conflicts: { start: Date; end: Date }[]
  ): TimeSlot[] {
    const duration = desiredEnd.getTime() - desiredStart.getTime();
    const suggestions: TimeSlot[] = [];
    const workingHoursStart = 9; // 9 AM
    const workingHoursEnd = 17; // 5 PM

    // Try slots before and after the conflicting time
    const beforeSlot = {
      start: new Date(desiredStart.getTime() - duration),
      end: desiredStart,
    };
    const afterSlot = {
      start: new Date(Math.max(...conflicts.map(c => c.end.getTime()))),
      end: new Date(Math.max(...conflicts.map(c => c.end.getTime())) + duration),
    };

    // Check if slots are within working hours
    if (this.isWithinWorkingHours(beforeSlot, workingHoursStart, workingHoursEnd)) {
      suggestions.push(beforeSlot);
    }
    if (this.isWithinWorkingHours(afterSlot, workingHoursStart, workingHoursEnd)) {
      suggestions.push(afterSlot);
    }

    // Try next day same time if no suitable slots found
    if (suggestions.length === 0) {
      const nextDay = new Date(desiredStart);
      nextDay.setDate(nextDay.getDate() + 1);
      suggestions.push({
        start: nextDay,
        end: new Date(nextDay.getTime() + duration),
      });
    }

    return suggestions;
  }

  private isWithinWorkingHours(
    slot: TimeSlot,
    startHour: number,
    endHour: number
  ): boolean {
    const start = slot.start.getHours();
    const end = slot.end.getHours();
    return start >= startHour && end <= endHour;
  }
}

export const calendarService = new CalendarService(); 