from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
from models.calendar_models import CalendarEvent, TimeSlot
import google_auth_oauthlib.flow
import logging
import os

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    def __init__(self, credentials: Union[Dict, Credentials]):
        try:
            # If credentials is a dict, convert it to Credentials object
            if isinstance(credentials, dict):
                credentials = Credentials(
                    token=credentials['token'],
                    refresh_token=credentials['refresh_token'],
                    token_uri=credentials['token_uri'],
                    client_id=credentials['client_id'],
                    client_secret=credentials['client_secret'],
                    scopes=credentials['scopes']
                )
            
            self.credentials = credentials
            self.service = build('calendar', 'v3', credentials=credentials)
        except Exception as e:
            logger.error(f"Failed to initialize calendar service: {str(e)}")
            raise Exception(f"Failed to initialize calendar service: {str(e)}")

    def get_credentials_dict(self) -> Dict:
        """Convert credentials to a dictionary for storage"""
        return {
            'token': self.credentials.token,
            'refresh_token': self.credentials.refresh_token,
            'token_uri': self.credentials.token_uri,
            'client_id': self.credentials.client_id,
            'client_secret': self.credentials.client_secret,
            'scopes': self.credentials.scopes
        }

    @classmethod
    def from_auth_code(cls, auth_code: str) -> 'GoogleCalendarService':
        """Create a GoogleCalendarService instance from an OAuth authorization code."""
        try:
            backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            client_secrets_file = os.path.join(backend_dir, 'client_secrets.json')
            
            logger.info(f"Looking for client_secrets.json at: {client_secrets_file}")
            
            if not os.path.exists(client_secrets_file):
                raise FileNotFoundError(f"client_secrets.json not found at {client_secrets_file}")
            
            flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
                client_secrets_file,
                scopes=['https://www.googleapis.com/auth/calendar'],
                redirect_uri='http://localhost:3000/auth/callback'
            )
            
            flow.fetch_token(code=auth_code)
            credentials = flow.credentials
            
            return cls(credentials)
        except Exception as e:
            logger.error(f"Failed to create calendar service from auth code: {str(e)}")
            raise

    async def list_events(
        self,
        start_time: datetime,
        end_time: datetime,
        timezone: str = 'UTC'
    ) -> List[Dict]:
        events_result = self.service.events().list(
            calendarId='primary',
            timeMin=start_time.isoformat() + 'Z',
            timeMax=end_time.isoformat() + 'Z',
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        return events_result.get('items', [])

    def _find_free_slots(
        self,
        start_time: datetime,
        end_time: datetime,
        busy_slots: List[tuple]
    ) -> List[TimeSlot]:
        free_slots = []
        current_time = start_time

        for busy_start, busy_end in sorted(busy_slots):
            if current_time < busy_start:
                free_slots.append(TimeSlot(
                    start=current_time,
                    end=busy_start
                ))
            current_time = busy_end

        if current_time < end_time:
            free_slots.append(TimeSlot(
                start=current_time,
                end=end_time
            ))

        return free_slots

    async def check_availability(
        self, 
        start_time: datetime, 
        end_time: datetime,
        timezone: str = 'UTC'
    ) -> List[TimeSlot]:
        try:
            events = await self.list_events(start_time, end_time)
            busy_slots = [(
                datetime.fromisoformat(event['start'].get('dateTime')),
                datetime.fromisoformat(event['end'].get('dateTime'))
            ) for event in events]
            
            # Calculate available slots
            available_slots = self._find_free_slots(start_time, end_time, busy_slots)
            return available_slots
        except Exception as e:
            raise Exception(f"Failed to check availability: {str(e)}")

    async def create_study_schedule(
        self,
        topics: List[str],
        start_date: datetime,
        end_date: datetime,
        daily_hours: int,
        preferred_time: str,
        excluded_days: List[str] = []
    ) -> List[CalendarEvent]:
        try:
            # Calculate study sessions per day
            session_duration = timedelta(hours=daily_hours / len(topics))
            current_date = start_date
            events = []

            while current_date <= end_date:
                if current_date.strftime('%A') not in excluded_days:
                    base_time = datetime.strptime(preferred_time, '%H:%M').time()
                    for i, topic in enumerate(topics):
                        session_start = datetime.combine(current_date, base_time) + timedelta(hours=i * daily_hours/len(topics))
                        session_end = session_start + session_duration

                        event = CalendarEvent(
                            summary=f"Study: {topic}",
                            description=f"Study session for {topic}",
                            start={"dateTime": session_start.isoformat(), "timeZone": "UTC"},
                            end={"dateTime": session_end.isoformat(), "timeZone": "UTC"},
                            reminders={
                                "useDefault": False,
                                "overrides": [{"method": "popup", "minutes": 15}]
                            }
                        )
                        
                        # Create event in Google Calendar
                        created_event = self.service.events().insert(
                            calendarId='primary',
                            body=event.dict(exclude_none=True)
                        ).execute()
                        
                        events.append(CalendarEvent(**created_event))

                current_date += timedelta(days=1)

            return events
        except Exception as e:
            raise Exception(f"Failed to create study schedule: {str(e)}")

    async def find_meeting_slots(
        self,
        attendees: List[str],
        duration_minutes: int,
        preferred_days: List[str],
        preferred_time_range: dict
    ) -> List[TimeSlot]:
        try:
            # Convert preferred time range to datetime
            now = datetime.now()
            search_end = now + timedelta(days=14)  # Look 2 weeks ahead
            
            # Get free/busy information for all attendees
            free_busy_query = {
                'timeMin': now.isoformat() + 'Z',
                'timeMax': search_end.isoformat() + 'Z',
                'items': [{'id': email} for email in attendees]
            }
            
            free_busy = self.service.freebusy().query(body=free_busy_query).execute()
            
            # Combine all busy periods
            all_busy_slots = []
            for calendar in free_busy['calendars'].values():
                busy_periods = calendar.get('busy', [])
                for period in busy_periods:
                    start = datetime.fromisoformat(period['start'].replace('Z', ''))
                    end = datetime.fromisoformat(period['end'].replace('Z', ''))
                    all_busy_slots.append((start, end))
            
            # Find available slots
            available_slots = []
            current_date = now.date()
            
            while current_date <= search_end.date():
                if current_date.strftime('%A') in preferred_days:
                    day_start = datetime.combine(
                        current_date, 
                        datetime.strptime(preferred_time_range['start'], '%H:%M').time()
                    )
                    day_end = datetime.combine(
                        current_date,
                        datetime.strptime(preferred_time_range['end'], '%H:%M').time()
                    )
                    
                    # Get free slots for this day
                    day_slots = self._find_free_slots(day_start, day_end, all_busy_slots)
                    
                    # Filter slots that are long enough for the meeting
                    for slot in day_slots:
                        duration = slot.end - slot.start
                        if duration >= timedelta(minutes=duration_minutes):
                            available_slots.append(slot)
                
                current_date += timedelta(days=1)
            
            return available_slots[:5]  # Return top 5 available slots
            
        except Exception as e:
            raise Exception(f"Failed to find meeting slots: {str(e)}")

    async def create_event(self, event_details: Dict) -> Dict:
        """Create a new event in Google Calendar"""
        try:
            event = self.service.events().insert(
                calendarId='primary',
                body=event_details
            ).execute()
            logger.info(f"Event created: {event.get('htmlLink')}")
            return event
        except Exception as e:
            logger.error(f"Failed to create event: {str(e)}")
            raise Exception(f"Failed to create event: {str(e)}")

    async def verify_calendar_access(self) -> Dict:
        """Verify Google Calendar access and permissions"""
        try:
            calendar_list = self.service.calendarList().list().execute()
            primary_calendar = next(
                (cal for cal in calendar_list['items'] if cal.get('primary')), None
            )
            
            if not primary_calendar:
                raise Exception("Could not access primary calendar")
            
            return {
                'status': 'success',
                'message': 'Calendar access verified successfully',
                'details': {
                    'calendar_id': primary_calendar['id'],
                    'calendar_name': primary_calendar.get('summary', 'Primary Calendar')
                }
            }
            
        except Exception as e:
            logger.error(f"Calendar access verification failed: {str(e)}")
            return {
                'status': 'error',
                'message': f"Calendar access verification failed: {str(e)}",
                'details': None
            }
