from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from services.calendar.google_calendar_service import GoogleCalendarService
from services.firebase.firebase_service import get_current_user

router = APIRouter()

class StudyScheduleRequest(BaseModel):
    topics: List[str]
    start_date: datetime
    end_date: datetime
    daily_hours: int
    preferred_time: str
    excluded_days: Optional[List[str]] = []

class MeetingRequest(BaseModel):
    title: str
    duration_minutes: int
    attendees: List[str]
    preferred_days: List[str]
    preferred_time_range: dict = {
        "start": "09:00",
        "end": "17:00"
    }

@router.post("/study-schedule")
async def create_study_schedule(
    request: StudyScheduleRequest,
    user = Depends(get_current_user)
):
    try:
        calendar_service = GoogleCalendarService(user.credentials)
        events = await calendar_service.create_study_schedule(
            topics=request.topics,
            start_date=request.start_date,
            end_date=request.end_date,
            daily_hours=request.daily_hours,
            preferred_time=request.preferred_time,
            excluded_days=request.excluded_days
        )
        return {"status": "success", "events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/meeting")
async def schedule_meeting(
    request: MeetingRequest,
    user = Depends(get_current_user)
):
    try:
        calendar_service = GoogleCalendarService(user.credentials)
        available_slots = await calendar_service.find_meeting_slots(
            attendees=request.attendees,
            duration_minutes=request.duration_minutes,
            preferred_days=request.preferred_days,
            preferred_time_range=request.preferred_time_range
        )
        return {"status": "success", "available_slots": available_slots}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/test-access")
async def verify_calendar_access(user = Depends(get_current_user)):
    try:
        calendar_service = GoogleCalendarService(user.credentials)
        result = await calendar_service.verify_calendar_access()
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['message'])
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
