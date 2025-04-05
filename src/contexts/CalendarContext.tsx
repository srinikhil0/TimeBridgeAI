import React, { useState, useEffect } from 'react';
import { calendarService } from '../services/calendar';
import { CalendarEvent, CreateCalendarEvent } from '../types/calendar';
import { CalendarContext } from './CalendarContextTypes';

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if calendar is already connected
  useEffect(() => {
    const checkConnection = () => {
      const isConnected = calendarService.isConnected();
      setIsCalendarConnected(isConnected);
      if (isConnected) {
        refreshEvents();
      }
    };

    // Check immediately
    checkConnection();

    // Set up an interval to periodically check connection status
    const interval = setInterval(checkConnection, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const connectCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      await calendarService.connect();
      setIsCalendarConnected(true);
      await refreshEvents();
    } catch (err) {
      setIsCalendarConnected(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to calendar');
    } finally {
      setLoading(false);
    }
  };

  const disconnectCalendar = () => {
    calendarService.disconnect();
    setIsCalendarConnected(false);
    setEvents([]);
  };

  const refreshEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const events = await calendarService.listEvents();
      setEvents(events || []);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Calendar access denied')) {
        setIsCalendarConnected(false);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (event: CreateCalendarEvent) => {
    try {
      setLoading(true);
      setError(null);
      const newEvent = await calendarService.createEvent(event);
      await refreshEvents();
      return newEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create calendar event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isCalendarConnected,
    events,
    loading,
    error,
    connectCalendar,
    disconnectCalendar,
    refreshEvents,
    createEvent,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}; 