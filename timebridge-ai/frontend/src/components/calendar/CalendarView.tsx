'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarEvent } from '@/types/calendar';

interface CalendarViewProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function CalendarView({ events = [], onEventClick, compact = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - startingDay + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  return (
    <div className={`w-full ${compact ? 'h-[400px]' : 'min-h-[600px]'} bg-gray-800/50 rounded-xl p-4 overflow-y-auto`}>
      {/* Calendar Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <button 
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h3 className="text-lg font-medium">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        
        <button 
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className={`text-center text-sm text-gray-400 ${compact ? 'py-1' : 'py-2'}`}>
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          return (
            <div 
              key={index}
              className={`${compact ? 'aspect-square' : 'min-h-[80px]'} p-1 ${
                day ? 'hover:bg-gray-700/30' : ''
              } rounded-lg transition-colors`}
            >
              {day && (
                <div className="h-full">
                  <span className="text-sm text-gray-400">{day}</span>
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="mt-1 px-1 py-0.5 text-xs bg-primary/20 rounded
                               cursor-pointer hover:bg-primary/30 truncate"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}