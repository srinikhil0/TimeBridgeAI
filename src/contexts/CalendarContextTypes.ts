import { createContext } from 'react';
import { CalendarEvent, CreateCalendarEvent } from '../types/calendar';

export interface CalendarContextType {
  isCalendarConnected: boolean;
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  connectCalendar: () => void;
  disconnectCalendar: () => void;
  refreshEvents: () => Promise<void>;
  createEvent: (event: CreateCalendarEvent) => Promise<CalendarEvent>;
}

export const CalendarContext = createContext<CalendarContextType | undefined>(undefined); 