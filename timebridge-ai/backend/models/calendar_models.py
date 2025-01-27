from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Union
from datetime import datetime

class TimeSlot(BaseModel):
    start: datetime
    end: datetime
    is_available: bool = True

class CalendarEvent(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    summary: str
    description: Optional[str] = None
    start: Dict[str, str]  # {"dateTime": "2024-03-20T09:00:00Z", "timeZone": "UTC"}
    end: Dict[str, str]
    attendees: Optional[List[Dict[str, str]]] = None  # [{"email": "example@gmail.com"}]
    reminders: Optional[Dict[str, Union[bool, List[Dict[str, Union[str, int]]]]]] = {
        "useDefault": False,
        "overrides": [
            {"method": "popup", "minutes": 15}
        ]
    }
    conferenceData: Optional[Dict[str, str]] = None
    location: Optional[str] = None

class StudySession(BaseModel):
    topic: str
    duration_minutes: int
    start_time: datetime
    materials: Optional[List[str]] = None
    
class StudySchedule(BaseModel):
    sessions: List[StudySession]
    excluded_days: Optional[List[str]] = None
    daily_hours: int
    reminder_minutes: int = 15
