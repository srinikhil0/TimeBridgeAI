from typing import List, Dict, Optional
from datetime import datetime, timedelta
from .base_handler import BaseCalendarHandler
import logging

logger = logging.getLogger(__name__)

class ScheduleHandler(BaseCalendarHandler):
    async def create_study_schedule(
        self,
        topics: List[str],
        start_date: datetime,
        end_date: datetime,
        daily_hours: int,
        preferred_time: str,
        excluded_days: List[str] = []
    ) -> List[Dict]:
        try:
            events = []
            current_date = start_date
            preferred_hour = int(preferred_time.split(':')[0])
            
            while current_date <= end_date:
                # Skip excluded days
                if current_date.strftime('%A').lower() in [day.lower() for day in excluded_days]:
                    current_date += timedelta(days=1)
                    continue
                
                # Create events for each topic
                hours_remaining = daily_hours
                current_hour = preferred_hour
                
                for topic in topics:
                    if hours_remaining <= 0:
                        break
                        
                    # Create 1-hour blocks for each topic
                    event_start = current_date.replace(hour=current_hour, minute=0)
                    event_end = event_start + timedelta(hours=1)
                    
                    event = {
                        'summary': f'Study: {topic}',
                        'description': f'Study session for {topic}',
                        'start': {
                            'dateTime': event_start.isoformat(),
                            'timeZone': 'UTC'
                        },
                        'end': {
                            'dateTime': event_end.isoformat(),
                            'timeZone': 'UTC'
                        },
                        'reminders': {
                            'useDefault': False,
                            'overrides': [
                                {'method': 'popup', 'minutes': 10}
                            ]
                        }
                    }
                    
                    # Create the event in Google Calendar
                    created_event = await self.calendar_service.create_event(event)
                    events.append(created_event)
                    
                    hours_remaining -= 1
                    current_hour += 1
                
                current_date += timedelta(days=1)
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to create study schedule: {str(e)}")
            raise
