import { google, calendar_v3 } from 'googleapis';
import { CalendarEvent } from '@/types/calendar';

interface CachedEventData {
  data: calendar_v3.Schema$Event[];
  timestamp: number;
}

export class CalendarService {
  private calendar: calendar_v3.Calendar;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private cachedEvents: Map<string, CachedEventData> = new Map();

  constructor(authClient: calendar_v3.Options['auth']) {
    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: authClient
    });
  }

  async listEvents(timeMin: Date, timeMax: Date) {
    try {
      // Only fetch events within specified range
      const cacheKey = `${timeMin.toISOString()}-${timeMax.toISOString()}`;
      const cached = this.cachedEvents.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        fields: 'items(id,summary,start,end)', // Only fetch required fields
      });
      
      // Ensure items is never undefined
      const events = response.data.items || [];
      
      // Cache the result
      this.cachedEvents.set(cacheKey, {
        data: events,
        timestamp: Date.now()
      });

      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  async createEvent(event: CalendarEvent) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
          },
          end: {
            dateTime: event.end.toISOString(),
          },
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Clear cached data
  clearCache() {
    this.cachedEvents.clear();
  }
} 