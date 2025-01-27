import google.generativeai as genai
from google.generativeai import GenerativeModel
from typing import Dict, List, Optional
import json
import logging
import asyncio
from datetime import datetime
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class GeminiService:
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
        
    async def process_message(self, message: str) -> Dict:
        try:
            logger.debug(f"Processing message: {message[:50]}...")
            
            prompt = """
            You are TimeBridgeAI, an intelligent calendar assistant. Your primary focus is on calendar management and scheduling.
            If users ask about non-calendar topics, politely redirect them to calendar-related assistance.
            
            Keep responses concise and focused on calendar functionality. Your response must be a valid JSON object.
            
            Example response format:
            {
                "message": "Your calendar-focused response here",
                "calendar_action": {
                    "type": "reminder|meeting|check",
                    "details": {}
                },
                "suggestions": ["Schedule a meeting", "Set a reminder", "Check availability"]
            }
            
            User message: """ + message
            
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(prompt, safety_settings=self.safety_settings)
            )
            
            # Clean and parse response
            response_text = response.text.strip()
            logger.debug(f"Raw response: {response_text}")
            
            try:
                # Try direct JSON parsing first
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from the text
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                if start_idx == -1 or end_idx == 0:
                    raise ValueError("No JSON found in response")
                
                json_str = response_text[start_idx:end_idx]
                result = json.loads(json_str)
            
            # Ensure required fields
            return {
                "message": result.get("message", "I'm here to help with your calendar needs."),
                "calendar_action": result.get("calendar_action"),
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
        # Create a prompt that helps Gemini understand calendar context
        prompt = f"""
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
        
        response = await self.model.generate_content(prompt)
        return json.loads(response.text)

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
