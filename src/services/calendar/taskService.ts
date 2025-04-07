import { googleAuthService } from '../auth/googleAuth';

interface TaskDetails {
  title: string;
  date?: string;
  time?: string;
  description?: string;
}

export class TaskService {
  private readonly API_BASE = 'https://tasks.googleapis.com/tasks/v1';

  async createTask(taskDetails: TaskDetails) {
    try {
      // First, get the default task list ID
      const taskList = await this.getDefaultTaskList();
      
      // Create the task in the default list
      const response = await fetch(`${this.API_BASE}/lists/${taskList.id}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: taskDetails.title,
          notes: taskDetails.description,
          due: this.formatDateTime(taskDetails.date, taskDetails.time),
          status: 'needsAction'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create task: ${error.error?.message || response.statusText}`);
      }

      const task = await response.json();
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  private async getDefaultTaskList() {
    const response = await fetch(`${this.API_BASE}/users/@me/lists`, {
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get task lists');
    }

    const { items } = await response.json();
    return items[0]; // Use the first list as default
  }

  private async getAccessToken(): Promise<string> {
    return googleAuthService.getAccessToken();
  }

  private formatDateTime(date?: string, time?: string): string | undefined {
    if (!date) return undefined;
    
    try {
      const dateObj = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      } else {
        // If no time specified, set to end of day
        dateObj.setHours(23, 59, 59);
      }
      
      return dateObj.toISOString();
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return undefined;
    }
  }
}

export const taskService = new TaskService(); 