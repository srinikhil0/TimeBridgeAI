from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Optional, List
from pydantic import BaseModel
from services.gemini_service import GeminiService
from services.google_calendar_service import GoogleCalendarService
from services.firebase_service import get_current_user
from firebase_admin import firestore
import os
from datetime import datetime
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict] = None

class ChatResponse(BaseModel):
    message: str
    calendar_actions: Optional[Dict] = None
    suggestions: Optional[List[str]] = None

gemini_service = None

@router.post("/chat/message", response_model=ChatResponse)
async def chat(message: ChatMessage, user: dict = Depends(get_current_user)):
    global gemini_service
    
    if gemini_service is None:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment variables")
            return ChatResponse(
                message="Service configuration error. Please try again later.",
                suggestions=[]
            )
        gemini_service = GeminiService(api_key=api_key)
    
    logger.info(f"Chat request from user: {user.get('email', 'unknown')}")
    try:
        # Initialize Firestore client
        db = firestore.client()
        user_id = user.get('uid')
        
        # Get user's calendar preferences (synchronously)
        user_prefs_ref = db.collection('userPreferences').document(user_id)
        user_prefs = user_prefs_ref.get()  # Removed await
        calendar_access = user_prefs.exists and user_prefs.get('calendarAccess', False) if user_prefs else False
        
        # Process message with AI
        response = await gemini_service.process_message(message.message)
        logger.debug(f"Gemini response: {response}")
        
        return ChatResponse(
            message=response.get('message', 'I apologize, but I encountered an error.'),
            calendar_actions=response.get('calendar_action'),
            suggestions=response.get('suggestions', [])
        )
            
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        return ChatResponse(
            message="An error occurred. Please try again later.",
            suggestions=[]
        )
