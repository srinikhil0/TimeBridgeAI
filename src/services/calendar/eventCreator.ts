import { EventDetails, EventCreationResponse, GoogleCalendarEvent } from './types';
import { calendarAuth } from './authUtils';

export class EventCreator {
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

  async createEvent(details: EventDetails): Promise<EventCreationResponse> {
    try {
      const accessToken = await calendarAuth.getAccessToken();
      const event = this.formatEventRequest(details);
      
      const response = await fetch(
        `${this.CALENDAR_API_BASE}/calendars/${details.calendarId || 'primary'}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            conferenceDataVersion: details.useGoogleMeet ? 1 : 0,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create event');
      }

      const data = await response.json();
      return {
        success: true,
        eventId: data.id,
        htmlLink: data.htmlLink,
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private formatEventRequest(details: EventDetails): GoogleCalendarEvent {
    const event: GoogleCalendarEvent = {
      summary: details.title,
      description: details.description,
      start: {
        dateTime: details.startDateTime.toISOString(),
        timeZone: details.timeZone,
      },
      end: {
        dateTime: (details.endDateTime || details.startDateTime).toISOString(),
        timeZone: details.timeZone,
      },
    };

    // Handle all-day events
    if (details.isAllDay) {
      event.start = {
        date: details.startDateTime.toISOString().split('T')[0],
        timeZone: details.timeZone,
      };
      event.end = {
        date: (details.endDateTime || details.startDateTime).toISOString().split('T')[0],
        timeZone: details.timeZone,
      };
    }

    // Add location if provided
    if (details.location) {
      event.location = details.location;
    }

    // Add Google Meet conferencing if requested
    if (details.useGoogleMeet) {
      event.conferenceData = {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    // Add attendees if provided
    if (details.guests?.length) {
      event.attendees = details.guests.map(guest => ({
        email: guest.email,
        optional: guest.optional,
      }));

      // Add guest permissions if provided
      if (details.guestPermissions) {
        event.guestsCanInviteOthers = details.guestPermissions.canInviteOthers;
        event.guestsCanSeeOtherGuests = details.guestPermissions.canSeeGuestList;
        event.guestsCanModify = details.guestPermissions.canModifyEvent;
      }
    }

    // Add reminders if provided
    if (details.reminders?.length) {
      event.reminders = {
        useDefault: false,
        overrides: details.reminders.map(reminder => ({
          method: reminder.method,
          minutes: reminder.minutes,
        })),
      };
    }

    // Add color if provided
    if (details.color) {
      event.colorId = details.color;
    }

    // Add visibility if provided
    if (details.visibility) {
      event.visibility = details.visibility;
    }

    return event;
  }
}

export const eventCreator = new EventCreator(); 