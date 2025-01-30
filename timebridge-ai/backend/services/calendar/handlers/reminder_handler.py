from typing import Dict, Optional, List
from datetime import datetime, timedelta
from .base_handler import BaseCalendarHandler
import logging
from google.api_core import retry
from googleapiclient.errors import HttpError
import asyncio

logger = logging.getLogger(__name__)

class ReminderHandler(BaseCalendarHandler):
    REMINDER_METHODS = ['email', 'popup']
    DEFAULT_REMINDER_MINUTES = {
        'email': 60,  # 1 hour before
        'popup': 15   # 15 minutes before
    }
    MAX_RETRIES = 3
    RETRY_DELAY = 1  # seconds

    async def validate_params(self, params: Dict) -> bool:
        required_fields = ['title', 'date', 'time']
        if not all(field in params for field in required_fields):
            logger.error(f"Missing required fields. Required: {required_fields}, Got: {list(params.keys())}")
            return False
        
        try:
            # Validate date and time format
            if isinstance(params['date'], str):
                datetime.strptime(params['date'], '%Y-%m-%d')
            datetime.strptime(params['time'], '%H:%M')
            
            # Validate reminder method if provided
            if 'method' in params and params['method'] not in self.REMINDER_METHODS:
                logger.error(f"Invalid reminder method: {params['method']}")
                return False
                
            return True
        except ValueError as e:
            logger.error(f"Date/time validation error: {str(e)}")
            return False

    @retry.Retry(predicate=retry.if_exception_type(HttpError))
    async def verify_event_creation(self, event_id: str) -> bool:
        """Verify that the event was actually created in Google Calendar"""
        try:
            event = await self.calendar_service.get_event(event_id)
            return bool(event and event.get('id') == event_id)
        except Exception as e:
            logger.error(f"Event verification failed: {str(e)}")
            return False

    async def execute(self, params: Dict, user_context: Optional[Dict] = None) -> Dict:
        try:
            # Validate parameters first
            if not await self.validate_params(params):
                raise ValueError("Invalid parameters provided")

            # Combine date and time
            reminder_datetime = datetime.combine(
                params['date'] if isinstance(params['date'], datetime) else datetime.strptime(params['date'], '%Y-%m-%d'),
                datetime.strptime(params['time'], '%H:%M').time()
            )
            
            # Create event with reminder
            event = {
                'summary': params['title'],
                'description': params.get('description', 'Reminder created by TimeBridgeAI'),
                'start': {
                    'dateTime': reminder_datetime.isoformat(),
                    'timeZone': params.get('timezone', 'UTC')
                },
                'end': {
                    'dateTime': (reminder_datetime + timedelta(minutes=30)).isoformat(),
                    'timeZone': params.get('timezone', 'UTC')
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {
                            'method': params.get('method', 'popup'),
                            'minutes': params.get('minutes', self.DEFAULT_REMINDER_MINUTES[params.get('method', 'popup')])
                        }
                    ]
                }
            }
            
            # Attempt to create event with retries
            retries = 0
            while retries < self.MAX_RETRIES:
                try:
                    created_event = await self.calendar_service.create_event(event)
                    
                    # Verify event creation
                    if await self.verify_event_creation(created_event['id']):
                        return {
                            'status': 'success',
                            'event': created_event,
                            'message': f"Reminder set for {reminder_datetime.strftime('%B %d, %Y at %I:%M %p')}",
                            'verified': True
                        }
                    else:
                        raise Exception("Event creation verification failed")
                        
                except HttpError as e:
                    retries += 1
                    if retries == self.MAX_RETRIES:
                        raise
                    await asyncio.sleep(self.RETRY_DELAY * retries)
            
        except Exception as e:
            logger.error(f"Failed to create reminder: {str(e)}")
            return await self.handle_error(e)

    async def handle_error(self, error: Exception) -> Dict:
        error_msg = str(error)
        logger.error(f"Reminder handler error: {error_msg}")
        
        if isinstance(error, HttpError):
            status_code = error.resp.status
            if status_code == 403:
                return {
                    'status': 'error',
                    'message': 'Calendar access denied. Please check your permissions.',
                    'details': error_msg
                }
            elif status_code == 401:
                return {
                    'status': 'error',
                    'message': 'Authentication failed. Please sign in again.',
                    'details': error_msg
                }
        
        return {
            'status': 'error',
            'message': 'Failed to set reminder',
            'details': error_msg
        }

    async def update_reminder(self, event_id: str, params: Dict) -> Dict:
        try:
            # Get existing event
            event = await self.calendar_service.get_event(event_id)
            
            # Update reminder settings
            event['reminders'] = {
                'useDefault': False,
                'overrides': [
                    {
                        'method': params.get('method', 'popup'),
                        'minutes': params.get('minutes', self.DEFAULT_REMINDER_MINUTES[params.get('method', 'popup')])
                    }
                ]
            }
            
            updated_event = await self.calendar_service.update_event(event_id, event)
            
            return {
                'status': 'success',
                'event': updated_event,
                'message': 'Reminder updated successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to update reminder: {str(e)}")
            return await self.handle_error(e)
