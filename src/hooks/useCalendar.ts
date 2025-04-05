import { useContext } from 'react';
import { CalendarContext } from '../contexts/CalendarContextTypes';

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}; 