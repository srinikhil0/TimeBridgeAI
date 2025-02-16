from typing import Dict, Optional
from datetime import datetime

class PromptTemplates:
    @staticmethod
    def get_calendar_analysis_prompt(user_message: str, context: Optional[Dict] = None) -> str:
        current_time = datetime.now().astimezone()
        user_tz = context.get('timezone', current_time.tzname())
        
        return f"""
        You are TimeBridgeAI, an intelligent calendar assistant. 
        Current time: {current_time.strftime('%Y-%m-%d %H:%M %Z')}
        User's timezone: {user_tz}
        User request: {user_message}
        
        IMPORTANT: ALL times mentioned by the user are in their local timezone ({user_tz}). 
        DO NOT convert times to UTC or any other timezone.
        
        For ANY reminder or calendar request, ALWAYS return response in this EXACT format:
        {{
            "message": "Your confirmation message here",
            "calendar_action": {{
                "type": "reminder",
                "details": {{
                    "title": "REQUIRED - Clear title",
                    "time": "REQUIRED - Local time exactly as user specified (HH:MM)",
                    "date": "REQUIRED - Local date in YYYY-MM-DD format"
                }}
            }}
        }}
        """

    @staticmethod
    def _reminder_prompt(params: Dict) -> str:
        return f"""
        Create a calendar reminder with the following details:
        Title: {params.get('title', 'Untitled Reminder')}
        Date: {params.get('date', 'Not specified')}
        Time: {params.get('time', 'Not specified')}
        Description: {params.get('description', '')}
        
        Return a JSON response with:
        {{
            "event": {{
                "title": "formatted title",
                "start_time": "ISO formatted datetime",
                "end_time": "ISO formatted datetime",
                "description": "formatted description",
                "reminder_minutes": [15, 30, 60]
            }},
            "confirmation_message": "user-friendly confirmation"
        }}
        """

    @staticmethod
    def _meeting_prompt(params: Dict) -> str:
        return f"""
        Schedule a meeting with these parameters:
        Title: {params.get('title', 'Untitled Meeting')}
        Duration: {params.get('duration_minutes', 30)} minutes
        Attendees: {', '.join(params.get('attendees', []))}
        Preferred Days: {', '.join(params.get('preferred_days', []))}
        Time Range: {params.get('time_range', {'start': '09:00', 'end': '17:00'})}
        
        Return a JSON response with:
        {{
            "event": {{
                "title": "formatted title",
                "start_time": "best suggested time",
                "end_time": "calculated end time",
                "attendees": ["email1", "email2"],
                "description": "meeting details"
            }},
            "alternatives": ["alternative time slots"]
        }}
        """

    @staticmethod
    def _schedule_prompt(params: Dict) -> str:
        return f"""
        Create a study/work schedule with:
        Topics: {', '.join(params.get('topics', []))}
        Start Date: {params.get('start_date', 'Not specified')}
        End Date: {params.get('end_date', 'Not specified')}
        Daily Hours: {params.get('daily_hours', 0)}
        
        Return a JSON response with:
        {{
            "schedule": [
                {{
                    "topic": "topic name",
                    "start_time": "ISO datetime",
                    "end_time": "ISO datetime",
                    "description": "session details"
                }}
            ],
            "summary": "schedule overview"
        }}
        """

    @staticmethod
    def _recurring_prompt(params: Dict) -> str:
        return f"""
        Set up a recurring event:
        Title: {params.get('title', 'Untitled Event')}
        Frequency: {params.get('frequency', 'daily|weekly|monthly')}
        Start Date: {params.get('start_date', 'Not specified')}
        End Date: {params.get('end_date', 'Not specified')}
        Time: {params.get('time', 'Not specified')}
        
        Return a JSON response with:
        {{
            "recurrence": {{
                "pattern": "RRULE string",
                "start_time": "ISO datetime",
                "end_time": "ISO datetime",
                "description": "event details"
            }},
            "preview": ["next 3 occurrences"]
        }}
        """

    @staticmethod
    def _default_prompt(params: Dict) -> str:
        return """
        I understand you want to manage your calendar. Could you please specify:
        1. What type of event you'd like to create?
        2. When should it occur?
        3. Any additional details like duration or participants?
        
        Return a JSON response with:
        {
            "clarification_needed": true,
            "questions": ["specific questions"],
            "suggestions": ["helpful suggestions"]
        }
        """

    @staticmethod
    def get_intent_specific_prompt(intent: str, params: Dict) -> str:
        # We'll add more specific prompts for each intent type
        prompts = {
            "reminder": PromptTemplates._reminder_prompt,
            "meeting": PromptTemplates._meeting_prompt,
            "schedule": PromptTemplates._schedule_prompt,
            "recurring": PromptTemplates._recurring_prompt
        }
        return prompts.get(intent, PromptTemplates._default_prompt)(params)