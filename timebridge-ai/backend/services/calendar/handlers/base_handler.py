from abc import ABC, abstractmethod
from typing import Dict, Optional
from services.calendar.google_calendar_service import GoogleCalendarService

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