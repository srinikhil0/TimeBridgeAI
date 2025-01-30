from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Optional, List
from pydantic import BaseModel
from services.ai import GeminiService
from services.calendar import GoogleCalendarService
from services.firebase import get_current_user
from firebase_admin import firestore
import os
from datetime import datetime
import logging
from services.calendar.handlers.reminder_handler import ReminderHandler
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

router = APIRouter()

logger = logging.getLogger(__name__)

# Initialize GeminiService with API key from environment
api_key = os.getenv('GEMINI_API_KEY')
gemini_service = None

class ChatContext(BaseModel):
    timestamp: Optional[str] = None
    previousMessages: Optional[List[Dict]] = None
    calendarEvents: Optional[List[Dict]] = None

class ChatMessage(BaseModel):
    message: str
    context: Optional[ChatContext] = None

class ChatResponse(BaseModel):
    message: str
    calendar_actions: Optional[Dict] = None
    suggestions: List[str] = []

@router.post("/message", response_model=ChatResponse)
async def chat(message: ChatMessage, user: dict = Depends(get_current_user)):
    global gemini_service
    
    if not gemini_service:
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY environment variable is not set"
            )
        gemini_service = GeminiService(api_key=api_key)

    user_email = user.get('email')
    calendar_service = None

    try:
        # Initialize Firestore client
        db = firestore.client()
        user_id = user.get('uid')
        
        logger.info(f"Chat request from user: {user_email}")
        
        # Get user document
        user_ref = db.collection('userPreferences').document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            calendar_access = user_data.get('calendarAccess', False)
            calendar_creds = user_data.get('calendarCredentials')
            
            if calendar_creds:
                logger.info(f"Initializing calendar service for user: {user_email}")
                try:
                    calendar_service = GoogleCalendarService(calendar_creds)
                    access_result = await calendar_service.verify_calendar_access()
                    if access_result['status'] == 'error':
                        logger.error(f"Calendar access verification failed: {access_result['message']}")
                        calendar_service = None
                except Exception as e:
                    logger.error(f"Failed to initialize calendar service: {str(e)}", exc_info=True)
                    calendar_service = None
        
        # Process message with AI
        response = await gemini_service.process_message(
            message.message,
            context=message.context.dict() if message.context else None
        )
        logger.debug(f"Gemini response: {response}")
        
        # Handle calendar actions if present
        calendar_action = response.get('calendar_action')
        if calendar_action:
            if not calendar_service:
                response['message'] += "\n\nI couldn't access your calendar. Please make sure you've granted calendar permissions."
                response['suggestions'] = ["Grant calendar access", "Try again later"]
            else:
                try:
                    action_type = calendar_action.get('type')
                    if action_type == 'reminder':
                        reminder_handler = ReminderHandler(calendar_service)
                        result = await reminder_handler.execute(calendar_action.get('details', {}))
                        
                        if result['status'] == 'success':
                            response['message'] = f"{response['message']}\n\n{result['message']}"
                        else:
                            response['message'] = f"Sorry, I couldn't set the reminder: {result['message']}"
                            response['suggestions'] = ["Try again", "Try a different time"]
                except Exception as e:
                    logger.error(f"Failed to execute calendar action: {str(e)}", exc_info=True)
                    response['message'] += "\n\nSorry, I encountered an error while setting up your calendar event."
                    response['suggestions'] = ["Try again", "Try a different time"]
        
        return ChatResponse(
            message=response['message'],
            calendar_actions=calendar_action if calendar_service else None,
            suggestions=response.get('suggestions', [])
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error for user {user_email}: {str(e)}", exc_info=True)
        return ChatResponse(
            message="I encountered an error processing your request. Please try again.",
            suggestions=["Try again"]
        )
