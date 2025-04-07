import { eventCreator } from './eventCreator';
import { EventDetails } from './types';
import { calendarIntentParser, CalendarIntent } from './calendarIntentParser';
import { locationService } from '../location/locationService';
import { calendarPromptService } from '../prompts/calendarPrompts';

export class AIEventHandler {
  private eventDetails: {
    title?: string;
    startTime?: Date;
    endTime?: Date;
    guests?: string[];
    description?: string;
    timezone?: string;
    location?: string;
    recurrence?: string;
  } = {};

  async handleEventCreation(userMessage: string): Promise<string> {
    // Get user's location and timezone
    const location = await locationService.getCurrentLocation();
    this.eventDetails.timezone = location.timezone;

    // Generate Gemini prompt with context
    const prompt = await calendarPromptService.generatePrompt(userMessage);
    const intent = await calendarIntentParser.parseIntent(prompt);
    
    if (!intent) {
      return "I'm not sure what kind of calendar operation you want to perform. Could you please rephrase your request?";
    }

    if (intent.confidence < 0.7) {
      return calendarPromptService.generateFollowUpQuestion(intent);
    }

    // Store the parsed information
    this.updateEventDetails(intent);

    // If we have missing information, ask for it
    if (intent.missingInfo.length > 0) {
      return calendarPromptService.generateFollowUpQuestion(intent);
    }

    // If we have complete information, show confirmation
    const confirmation = calendarPromptService.generateConfirmation(intent);
    if (this.hasCompleteInformation(intent)) {
      return `${confirmation}\n\nShall I create this event?`;
    }

    return confirmation;
  }

  private updateEventDetails(intent: CalendarIntent) {
    if (intent.parameters.dateTime) {
      this.eventDetails.startTime = intent.parameters.dateTime.start;
      this.eventDetails.endTime = intent.parameters.dateTime.end;
    }
    if (intent.parameters.title) {
      this.eventDetails.title = intent.parameters.title;
    }
    if (intent.parameters.guests) {
      this.eventDetails.guests = intent.parameters.guests;
    }
    if (intent.parameters.description) {
      this.eventDetails.description = intent.parameters.description;
    }
    if (intent.parameters.location) {
      this.eventDetails.location = intent.parameters.location;
    }
    if (intent.parameters.recurrence) {
      this.eventDetails.recurrence = intent.parameters.recurrence;
    }
  }

  async handleUserResponse(response: string): Promise<string> {
    // Check if this is a confirmation response
    if (this.isConfirmationResponse(response)) {
      if (this.isAffirmative(response)) {
        return this.createEventWithDetails();
      } else {
        this.eventDetails = {};
        return "Okay, let's start over. What event would you like to create?";
      }
    }

    // Parse the response in the context of what we're missing
    const prompt = await calendarPromptService.generatePrompt(response);
    const intent = await calendarIntentParser.parseIntent(prompt);

    if (intent && intent.confidence > 0.7) {
      this.updateEventDetails(intent);
    }

    // Continue the conversation
    return this.continueEventCreation();
  }

  private isConfirmationResponse(response: string): boolean {
    const confirmationKeywords = ['yes', 'no', 'correct', 'incorrect', 'right', 'wrong', 'cancel'];
    return confirmationKeywords.some(keyword => response.toLowerCase().includes(keyword));
  }

  private isAffirmative(response: string): boolean {
    const affirmativeKeywords = ['yes', 'correct', 'right', 'sure', 'okay', 'fine'];
    return affirmativeKeywords.some(keyword => response.toLowerCase().includes(keyword));
  }

  private hasCompleteInformation(intent: CalendarIntent): boolean {
    return !!(intent.parameters.dateTime?.start && intent.parameters.title);
  }

  public async createEventFromIntent(intent: CalendarIntent): Promise<string> {
    if (!intent.parameters.dateTime || !intent.parameters.title) {
      throw new Error('Missing required event details');
    }

    const eventDetails: EventDetails = {
      title: intent.parameters.title,
      startDateTime: intent.parameters.dateTime.start,
      endDateTime: intent.parameters.dateTime.end,
      description: intent.parameters.description || '',
      guests: intent.parameters.guests?.map(email => ({ email })) || [],
      isAllDay: false,
      timeZone: this.eventDetails.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const result = await eventCreator.createEvent(eventDetails);
    
    if (result.success) {
      if (!eventDetails.startDateTime || !eventDetails.endDateTime) {
        throw new Error('Invalid event date/time');
      }

      const guestInfo = Array.isArray(eventDetails.guests) && eventDetails.guests.length > 0
        ? `Guests: ${eventDetails.guests.map(g => g.email).join(', ')}`
        : 'No guests';

      // Format times in user's timezone
      const startTime = locationService.formatDateToLocalTime(eventDetails.startDateTime);
      const endTime = locationService.formatDateToLocalTime(eventDetails.endDateTime);

      return `Great! I've created your event:
Title: ${eventDetails.title}
Time: ${startTime} - ${endTime} (${this.eventDetails.timezone})
${guestInfo}
${eventDetails.description ? `Description: ${eventDetails.description}` : 'No description'}

You can view it here: ${result.htmlLink}`;
    } else {
      throw new Error(result.error);
    }
  }

  private async continueEventCreation(): Promise<string> {
    // If we don't have a title, ask for it first
    if (!this.eventDetails.title) {
      if (this.eventDetails.startTime) {
        return `I'll help you create a calendar event for ${this.eventDetails.startTime.toLocaleString()}. What would you like to title this event?`;
      }
      return "I'll help you create a calendar event. What would you like to title this event?";
    }

    // If we have title but no time, ask for time
    if (!this.eventDetails.startTime) {
      return "What time would you like to schedule this event?";
    }

    // If we have basic details but no guests, ask about guests
    if (!this.eventDetails.guests) {
      return "Would you like to add any guests to this event? Please provide their email addresses, or say 'no guests' if you don't want to add any.";
    }

    // If we have all basic details but no description, ask for it
    if (!this.eventDetails.description) {
      return "Would you like to add a description to the event? If not, just say 'no description'.";
    }

    // If we have all details, create the event
    return this.createEventWithDetails();
  }

  public isNewEventRequest(message: string): boolean {
    return message.toLowerCase().includes('create') || 
           message.toLowerCase().includes('schedule') || 
           message.toLowerCase().includes('new event');
  }

  private async createEventWithDetails(): Promise<string> {
    try {
      const eventDetails: EventDetails = {
        title: this.eventDetails.title || 'Untitled Event',
        startDateTime: this.eventDetails.startTime!,
        endDateTime: this.eventDetails.endTime!,
        description: this.eventDetails.description || '',
        guests: this.eventDetails.guests?.map(email => ({ email })) || [],
        isAllDay: false,
        timeZone: this.eventDetails.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const result = await eventCreator.createEvent(eventDetails);
      
      // Reset event details after successful creation
      this.eventDetails = {};

      if (result.success) {
        if (!eventDetails.startDateTime || !eventDetails.endDateTime) {
          throw new Error('Invalid event date/time');
        }

        const startTime = locationService.formatDateToLocalTime(eventDetails.startDateTime);
        const endTime = locationService.formatDateToLocalTime(eventDetails.endDateTime);
        const guestList = eventDetails.guests?.map(g => g.email).join(', ');
        
        return `Great! I've created your event:
Title: ${eventDetails.title}
Time: ${startTime} - ${endTime} (${eventDetails.timeZone})
${guestList ? `Guests: ${guestList}` : 'No guests'}
${eventDetails.description ? `Description: ${eventDetails.description}` : 'No description'}

You can view it here: ${result.htmlLink}`;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Event creation error:', error);
      return "I encountered an error while creating the event. Please try again.";
    }
  }
}

export const aiEventHandler = new AIEventHandler(); 