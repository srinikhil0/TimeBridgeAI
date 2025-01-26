'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { CalendarEvent } from '@/types/calendar';

interface CollapsibleCalendarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  events?: CalendarEvent[];
}

export function CollapsibleCalendar({ isOpen = false, onToggle, events }: CollapsibleCalendarProps) {
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  const handleToggle = () => {
    const newState = !localIsOpen;
    setLocalIsOpen(newState);
    onToggle?.();
  };

  return (
    <div className="w-full bg-gray-800/50 rounded-xl overflow-hidden transition-all duration-300">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-2 flex items-center justify-between 
                 hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-200">Calendar View</span>
        {localIsOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {localIsOpen && (
        <div className="p-4">
          <CalendarView events={events} compact />
        </div>
      )}
    </div>
  );
}