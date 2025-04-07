export type EventVisibility = 'default' | 'public' | 'private';

export type ReminderType = 'notification' | 'email';

export interface EventReminder {
  method: ReminderType;
  minutes: number;
}

export interface EventGuest {
  email: string;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export interface EventPermissions {
  canInviteOthers: boolean;
  canSeeGuestList: boolean;
  canModifyEvent: boolean;
}

export interface EventDetails {
  title: string;
  startDateTime: Date;
  endDateTime?: Date;
  isAllDay: boolean;
  timeZone?: string;
  description?: string;
  location?: string;
  guests?: EventGuest[];
  guestPermissions?: EventPermissions;
  useGoogleMeet?: boolean;
  reminders?: EventReminder[];
  attachments?: string[]; // URLs or file IDs
  color?: string;
  visibility?: EventVisibility;
  calendarId?: string; // defaults to primary
}

export interface EventCreationResponse {
  success: boolean;
  eventId?: string;
  error?: string;
  htmlLink?: string; // URL to view the event in Google Calendar
}

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: string };
    };
  };
  attendees?: Array<{
    email: string;
    optional?: boolean;
  }>;
  guestsCanInviteOthers?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  guestsCanModify?: boolean;
  reminders?: {
    useDefault: boolean;
    overrides: Array<{
      method: string;
      minutes: number;
    }>;
  };
  colorId?: string;
  visibility?: EventVisibility;
} 