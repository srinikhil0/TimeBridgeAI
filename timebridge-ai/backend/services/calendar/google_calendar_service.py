from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from models.calendar_models import CalendarEvent, TimeSlot
import google_auth_oauthlib.flow

class GoogleCalendarService:
    def __init__(self, credentials):
        try:
            flow = google_auth_oauthlib.flow.Flow.from_client_config(
                {
                    "web": {
                        "client_id": credentials['client_id'],
                        "client_secret": credentials['client_secret'],
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                },
                scopes=credentials['scopes']
            )
            
            creds = flow.credentials
            creds.token = credentials['token']
            
            self.service = build('calendar', 'v3', credentials=creds)
        except Exception as e:
            raise Exception(f"Failed to initialize calendar service: {str(e)}")

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
