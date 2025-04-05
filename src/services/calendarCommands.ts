export interface CalendarCommand {
  type: 'create' | 'view' | 'modify' | 'delete' | 'check_availability';
  details: {
    title?: string;
    startTime?: Date;
    endTime?: Date;
    location?: string;
    attendees?: string[];
    description?: string;
  };
}

class CalendarCommands {
  private static readonly COMMAND_PATTERNS = {
    create: /^(schedule|create|add|set up)\s+(?:a|an)?\s*(meeting|event|appointment)/i,
    view: /^(show|view|list|what's|what is)\s+(?:my|the)?\s*(schedule|calendar|events|meetings)/i,
    modify: /^(change|modify|update|reschedule)\s+(?:my|the)?\s*(meeting|event|appointment)/i,
    delete: /^(cancel|delete|remove)\s+(?:my|the)?\s*(meeting|event|appointment)/i,
    check_availability: /^(check|see|find)\s+(?:my|the)?\s*(availability|free time|schedule)/i
  };

  static parseCommand(message: string): CalendarCommand | null {
    for (const [type, pattern] of Object.entries(this.COMMAND_PATTERNS)) {
      if (pattern.test(message)) {
        return {
          type: type as CalendarCommand['type'],
          details: this.extractDetails(message)
        };
      }
    }
    return null;
  }

  private static extractDetails(message: string): CalendarCommand['details'] {
    // Basic implementation - can be enhanced with more sophisticated NLP
    const details: CalendarCommand['details'] = {};

    // Extract time phrases
    const timeMatch = message.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (timeMatch) {
      // TODO: Implement proper time parsing
      details.startTime = new Date(); // Placeholder
    }

    // Extract location
    const locationMatch = message.match(/at\s+([^.,!?]+)/i);
    if (locationMatch) {
      details.location = locationMatch[1].trim();
    }

    // Extract title/description
    const titleMatch = message.match(/(?:about|regarding|for)\s+([^.,!?]+)/i);
    if (titleMatch) {
      details.title = titleMatch[1].trim();
    }

    return details;
  }

  static isCalendarCommand(message: string): boolean {
    return Object.values(this.COMMAND_PATTERNS).some(pattern => pattern.test(message));
  }
}

export default CalendarCommands; 