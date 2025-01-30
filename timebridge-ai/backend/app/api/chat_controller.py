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
calendar_service = None

@router.post("/message", response_model=ChatResponse)
async def chat(message: ChatMessage, user: dict = Depends(get_current_user)):
    global gemini_service, calendar_service
    
    if gemini_service is None:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment variables")
            return ChatResponse(
                message="Service configuration error. Please try again later.",
                suggestions=[]
            )
        gemini_service = GeminiService(api_key=api_key)
    
    user_email = user.get('email', 'unknown')
    logger.info(f"Chat request from user: {user_email}")
    
    # Check calendar service initialization
    if calendar_service is None:
        try:
            # Initialize Firestore client
            db = firestore.client()
            user_id = user.get('uid')
            
            # Get user's calendar credentials from Firestore
            user_doc = db.collection('userPreferences').document(user_id).get()
            
            if not user_doc.exists:
                logger.error(f"No user document found for user: {user_email}")
                return ChatResponse(
                    message="Please complete your calendar setup first.",
                    suggestions=["Setup calendar access"]
                )
            
            user_data = user_doc.to_dict()
            calendar_creds = user_data.get('calendarCredentials')
            
            if not calendar_creds:
                logger.warning(f"No calendar credentials found in Firestore for user: {user_email}")
                return ChatResponse(
                    message="I need access to your Google Calendar to set reminders. Please grant calendar permissions.",
                    suggestions=["Grant calendar access"]
                )
            
            logger.info(f"Initializing calendar service for user: {user_email}")
            logger.debug(f"Calendar credentials found in Firestore")
            
            try:
                calendar_service = GoogleCalendarService(calendar_creds)
                # Test calendar access
                access_test = await calendar_service.test_calendar_access()
                if access_test['status'] == 'error':
                    logger.error(f"Calendar access test failed: {access_test['message']}")
                    return ChatResponse(
                        message="I have trouble accessing your calendar. Please check your Google Calendar permissions.",
                        suggestions=["Grant calendar access", "Try again later"]
                    )
                logger.info(f"Calendar access test successful: {access_test['details']}")
            except Exception as e:
                logger.error(f"Failed to initialize calendar service: {str(e)}", exc_info=True)
                return ChatResponse(
                    message="I'm having trouble accessing your calendar. Please check your Google Calendar permissions.",
                    suggestions=["Grant calendar access", "Try again later"]
                )
        except Exception as e:
            logger.error(f"Failed to fetch calendar credentials: {str(e)}", exc_info=True)
            return ChatResponse(
                message="Unable to access your calendar settings. Please try again later.",
                suggestions=["Try again later"]
            )
    
    try:
        # Initialize Firestore client
        db = firestore.client()
        user_id = user.get('uid')
        
        # Get user's calendar preferences
        user_prefs_ref = db.collection('userPreferences').document(user_id)
        user_prefs = user_prefs_ref.get()
        calendar_access = user_prefs.exists and user_prefs.get('calendarAccess', False) if user_prefs else False
        
        logger.info(f"Calendar access status for {user_email}: {calendar_access}")
        
        # Process message with AI
        response = await gemini_service.process_message(message.message)
        logger.debug(f"Gemini response: {response}")
        
        # Handle calendar actions if present
        calendar_action = response.get('calendar_action')
        if calendar_action:
            if not calendar_service:
                logger.error(f"Calendar action requested but no calendar service available for user: {user_email}")
                response['message'] += "\n\nI couldn't access your calendar. Please make sure you've granted calendar permissions."
            else:
                action_type = calendar_action.get('type')
                logger.info(f"Processing calendar action type '{action_type}' for user: {user_email}")
                
                if action_type == 'reminder':
                    reminder_handler = ReminderHandler(calendar_service)
                    details = calendar_action.get('details', {})
                    
                    # Convert time and date to proper format
                    time_str = details.get('time', '').upper()  # Convert "4:00 AM" format
                    date_str = details.get('date', '').lower()
                    
                    if date_str == 'today':
                        date_str = datetime.now().strftime('%Y-%m-%d')
                    
                    logger.debug(f"Reminder details - Time: {time_str}, Date: {date_str}, Title: {details.get('title')}")
                    
                    params = {
                        'title': details.get('title', 'Reminder'),
                        'date': date_str,
                        'time': datetime.strptime(time_str, '%I:%M %p').strftime('%H:%M'),
                        'description': details.get('description', ''),
                        'timezone': user.get('timezone', 'UTC')
                    }
                    
                    logger.info(f"Attempting to create reminder for user {user_email} with params: {params}")
                    
                    result = await reminder_handler.execute(params)
                    if result.get('status') == 'error':
                        logger.error(f"Reminder creation failed for user {user_email}: {result}")
                        response['message'] += f"\n\nHowever, I couldn't set the reminder in your calendar. {result['message']}"
                    else:
                        logger.info(f"Reminder created successfully for user {user_email}: {result}")
                        response['message'] += "\n\nI've added this to your calendar."
        
        return ChatResponse(
            message=response.get('message', 'I apologize, but I encountered an error.'),
            calendar_actions=response.get('calendar_action'),
            suggestions=response.get('suggestions', [])
        )
            
    except Exception as e:
        logger.error(f"Chat endpoint error for user {user_email}: {str(e)}", exc_info=True)
        return ChatResponse(
            message="I apologize, but I encountered an error. Please try again later.",
            suggestions=["Try rephrasing your request", "Check if the service is available"]
        )
