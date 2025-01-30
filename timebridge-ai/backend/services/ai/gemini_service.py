import google.generativeai as genai
from google.generativeai import GenerativeModel
from typing import Dict, List, Optional
import json
import logging
import asyncio
from datetime import datetime, timedelta
from fastapi import HTTPException
import pytz
from services.ai.prompt_templates import PromptTemplates

logger = logging.getLogger(__name__)

class GeminiService:
    # Comprehensive timezone mapping
    TIMEZONE_MAPPING = {
        # North America
        'Eastern Standard Time': 'America/New_York',
        'EST': 'America/New_York',
        'EDT': 'America/New_York',
        'Central Standard Time': 'America/Chicago',
        'CST': 'America/Chicago',
        'CDT': 'America/Chicago',
        'Mountain Standard Time': 'America/Denver',
        'MST': 'America/Denver',
        'MDT': 'America/Denver',
        'Pacific Standard Time': 'America/Los_Angeles',
        'PST': 'America/Los_Angeles',
        'PDT': 'America/Los_Angeles',
        'Alaska Standard Time': 'America/Anchorage',
        'Hawaii-Aleutian Standard Time': 'Pacific/Honolulu',
        
        # Europe
        'GMT Standard Time': 'Europe/London',
        'British Summer Time': 'Europe/London',
        'Central European Time': 'Europe/Paris',
        'Central European Summer Time': 'Europe/Paris',
        'Eastern European Time': 'Europe/Helsinki',
        
        # Asia
        'India Standard Time': 'Asia/Kolkata',
        'IST': 'Asia/Kolkata',
        'China Standard Time': 'Asia/Shanghai',
        'Japan Standard Time': 'Asia/Tokyo',
        'Singapore Standard Time': 'Asia/Singapore',
        
        # Australia
        'Australian Eastern Standard Time': 'Australia/Sydney',
        'Australian Central Standard Time': 'Australia/Adelaide',
        'Australian Western Standard Time': 'Australia/Perth'
    }

    def __init__(self, api_key: str):
        if not api_key:
            logger.error("GEMINI_API_KEY not found")
            raise ValueError("GEMINI_API_KEY is required")
            
        logger.info("Initializing GeminiService")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
        
    async def process_message(self, message: str, context: Optional[Dict] = None) -> Dict:
        try:
            # Get user's local timezone
            local_tz = datetime.now().astimezone().tzinfo
            
            # Get timezone from mapping
            tz_name = str(local_tz)
            pytz_timezone = self.TIMEZONE_MAPPING.get(tz_name, 'UTC')
            
            # Add timezone to context for AI
            context = context or {}
            context['timezone'] = pytz_timezone
            
            # Use calendar analysis prompt
            prompt = PromptTemplates.get_calendar_analysis_prompt(message, context)
            logger.debug(f"Generated prompt: {prompt}")
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            logger.debug(f"Raw response: {response_text}")
            
            result = json.loads(response_text)
            
            calendar_action = result.get('calendar_action', {})
            if calendar_action and calendar_action.get('type') == 'reminder':
                details = calendar_action.get('details', {})
                details['timezone'] = pytz_timezone
                
                # Ensure we have all required fields
                if not all(k in details for k in ['title', 'time', 'date']):
                    raise ValueError("Missing required reminder details")
                
            return {
                "message": result.get("message", "I'm here to help with your calendar needs."),
                "calendar_action": calendar_action,
                "suggestions": result.get("suggestions", ["Schedule a meeting", "Check calendar"])
            }
            
        except Exception as e:
            logger.error(f"Process message error: {str(e)}", exc_info=True)
            return {
                "message": "I apologize, but I'm having trouble understanding. Could you rephrase that?",
                "calendar_action": None,
                "suggestions": ["Try asking in a different way"]
            }

    async def process_calendar_request(
        self, 
        user_message: str,
        context: Optional[Dict] = None
    ) -> Dict:
        logger.info(f"Processing calendar request: {user_message}")
        logger.debug(f"Context: {context}")

        try:
            prompt = self._create_prompt(user_message, context)
            logger.debug(f"Generated prompt: {prompt}")

            response = await self.model.generate_content(prompt)
            parsed_response = json.loads(response.text)
            
            logger.info(f"AI response generated successfully: {parsed_response['intent']}")
            logger.debug(f"Full AI response: {parsed_response}")
            
            return parsed_response
        except Exception as e:
            logger.error(f"Failed to process calendar request: {str(e)}")
            raise

    def _create_prompt(self, user_message: str, context: Optional[Dict]) -> str:
        logger.debug("Creating prompt with context")
        return f"""
        You are TimeBridgeAI, an intelligent calendar assistant. 
        User request: {user_message}
        Previous context: {json.dumps(context) if context else 'None'}
        
        Analyze the request and provide a response in the following JSON format:
        {{
            "intent": "study_schedule|meeting|birthday|general",
            "action_required": true|false,
            "calendar_actions": [],
            "response": "Your natural response here",
            "required_info": ["any additional info needed"],
            "suggestions": ["follow-up suggestions"]
        }}
        """

    async def generate_study_schedule(
        self,
        topics: List[str],
        duration_days: int,
        hours_per_day: int
    ) -> Dict:
        prompt = f"""
        Create an optimal study schedule for:
        Topics: {', '.join(topics)}
        Duration: {duration_days} days
        Hours per day: {hours_per_day}

        Provide a schedule that:
        1. Alternates between topics
        2. Includes breaks
        3. Has review sessions
        4. Sets appropriate reminders

        Return in JSON format with specific time slots and topics.
        """
        
        response = await self.model.generate_content(prompt)
        return json.loads(response.text)
