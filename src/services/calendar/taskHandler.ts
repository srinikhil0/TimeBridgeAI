import { taskService } from './taskService';

interface ParsedTaskDetails {
  title?: string;
  date?: string;
  time?: string;
  description?: string;
  missingFields: string[];
}

export class TaskHandler {
  parseTaskRequest(message: string): ParsedTaskDetails {
    const details: ParsedTaskDetails = {
      missingFields: []
    };

    // Try to extract title
    const titleMatch = message.match(/(?:create|add|set|make)(?:\sa)?\stask(?:\sto)?\s(.*?)(?:\son|at|by|$)/i);
    if (titleMatch) {
      details.title = titleMatch[1].trim();
    } else {
      details.missingFields.push('title');
    }

    // Try to extract date
    const dateMatch = message.match(/\bon\s([\w\s,]+)(?:\sat|by|$)/i);
    if (dateMatch) {
      details.date = this.parseDateString(dateMatch[1].trim());
    }

    // Try to extract time
    const timeMatch = message.match(/\bat\s(\d{1,2}(?::\d{2})?(?:\s?[AaPp][Mm])?)/i);
    if (timeMatch) {
      details.time = this.parseTimeString(timeMatch[1].trim());
    }

    // Try to extract description
    const descMatch = message.match(/\bdescription(?::\s|\s-\s|\s)(.*?)(?:\son|at|by|$)/i);
    if (descMatch) {
      details.description = descMatch[1].trim();
    }

    return details;
  }

  async handleTaskCreation(message: string): Promise<string> {
    const parsedDetails = this.parseTaskRequest(message);

    // If we're missing required fields, ask for them
    if (parsedDetails.missingFields.length > 0 || !parsedDetails.title) {
      return this.generatePromptForMissingFields(parsedDetails);
    }

    try {
      await taskService.createTask({
        title: parsedDetails.title,
        date: parsedDetails.date,
        time: parsedDetails.time,
        description: parsedDetails.description
      });

      return this.generateSuccessResponse(parsedDetails);
    } catch (error) {
      console.error('Error creating task:', error);
      return "I encountered an error while creating your task. Please try again or check your calendar permissions.";
    }
  }

  private generatePromptForMissingFields(details: ParsedTaskDetails): string {
    if (!details.title) {
      return "What would you like to name this task?";
    }

    const prompts = [];
    if (!details.date) {
      prompts.push("When would you like to set this task for?");
    }
    if (!details.time) {
      prompts.push("What time would you like to set for this task? (optional)");
    }
    if (!details.description) {
      prompts.push("Would you like to add a description for this task? (optional)");
    }

    return prompts.join('\n');
  }

  private generateSuccessResponse(details: ParsedTaskDetails): string {
    let response = `I've created a task "${details.title}"`;
    if (details.date) {
      response += ` for ${details.date}`;
      if (details.time) {
        response += ` at ${details.time}`;
      }
    }
    if (details.description) {
      response += ` with the description: ${details.description}`;
    }
    return response + '.';
  }

  private parseDateString(dateStr: string): string {
    // Convert natural language date to ISO format
    // This is a simple implementation - you might want to use a library like date-fns
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }

  private parseTimeString(timeStr: string): string {
    // Convert various time formats to HH:mm
    // This is a simple implementation - you might want to use a library like date-fns
    const timeParts = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
    if (!timeParts) return '';

    let hours = parseInt(timeParts[1]);
    const minutes = timeParts[2] ? parseInt(timeParts[2]) : 0;
    const meridiem = timeParts[3]?.toLowerCase();

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

export const taskHandler = new TaskHandler(); 