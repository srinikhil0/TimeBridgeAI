from abc import ABC, abstractmethod
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from services.calendar import GoogleCalendarService

class BaseCalendarHandler(ABC):
    def __init__(self, calendar_service: GoogleCalendarService):
        self.calendar_service = calendar_service

    @abstractmethod
    async def validate_params(self, params: Dict) -> bool:
        """Validate the parameters required for this handler"""
        pass

    @abstractmethod
    async def execute(self, params: Dict, user_context: Optional[Dict] = None) -> Dict:
        """Execute the calendar action"""
        pass

    @abstractmethod
    async def handle_error(self, error: Exception) -> Dict:
        """Handle any errors that occur during execution"""
        pass

    async def check_conflicts(
        self,
        start_time: datetime,
        end_time: datetime,
        timezone: str = 'UTC'
    ) -> List[Dict]:
        """Check for any conflicting events in the given time period"""
        existing_events = await self.calendar_service.list_events(
            start_time=start_time,
            end_time=end_time,
            timezone=timezone
        )
        return existing_events
    
    async def create_event(self, event_details: Dict) -> Dict:
        """Create a new calendar event"""
        return await self.calendar_service.create_event(event_details)