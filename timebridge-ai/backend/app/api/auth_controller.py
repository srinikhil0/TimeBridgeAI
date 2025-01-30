from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from firebase_admin import auth, firestore
from services.firebase import get_current_user
from services.calendar.google_calendar_service import GoogleCalendarService
import logging
from fastapi.responses import RedirectResponse

router = APIRouter()
logger = logging.getLogger(__name__)

class AuthRequest(BaseModel):
    id_token: str

class AuthResponse(BaseModel):
    uid: str
    email: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

class CalendarSetupRequest(BaseModel):
    auth_code: str

@router.post("/verify", response_model=AuthResponse)
async def verify_token(request: AuthRequest):
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(request.id_token)
        
        # Get user details
        user = auth.get_user(decoded_token['uid'])
        
        # Initialize Firestore
        db = firestore.client()
        
        # Check if user document exists
        user_ref = db.collection('userPreferences').document(user.uid)
        user_doc = user_ref.get()
        
        # Create user document if it doesn't exist
        if not user_doc.exists:
            logger.info(f"Creating new user document for: {user.email}")
            user_ref.set({
                'email': user.email,
                'calendarAccess': False,
                'calendarCredentials': None,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
        
        return AuthResponse(
            uid=user.uid,
            email=user.email,
            access_token=decoded_token.get('access_token'),
            refresh_token=decoded_token.get('refresh_token')
        )
        
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}"
        )

@router.post("/setup-calendar")
async def setup_calendar(
    request: CalendarSetupRequest,
    user: Optional[Dict] = Depends(get_current_user)
):
    try:
        db = firestore.client()
        user_id = user.get('uid') if user else 'test_user'
        user_email = user.get('email') if user else 'test@example.com'
        
        logger.info(f"Setting up calendar for user: {user_email}")
        
        # Initialize calendar service with auth code
        calendar_service = GoogleCalendarService.from_auth_code(request.auth_code)
        
        # Verify access by attempting to list calendars
        try:
            calendar_list = calendar_service.service.calendarList().list().execute()
            primary_calendar = next((cal for cal in calendar_list['items'] if cal.get('primary')), None)
            if not primary_calendar:
                raise Exception("Could not access primary calendar")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Calendar access verification failed: {str(e)}")
        
        # Get credentials for storage
        credentials = calendar_service.get_credentials_dict()
        
        # Update user document
        user_ref = db.collection('userPreferences').document(user_id)
        user_ref.set({
            'calendarAccess': True,
            'calendarCredentials': credentials,
            'lastUpdated': firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        logger.info(f"Calendar setup completed for user: {user_email}")
        return {
            "status": "success",
            "message": "Calendar setup completed successfully",
            "details": {
                "calendar_id": primary_calendar['id'],
                "calendar_name": primary_calendar.get('summary', 'Primary Calendar')
            }
        }
        
    except Exception as e:
        logger.error(f"Calendar setup failed for user {user_email}: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Calendar setup failed: {str(e)}"
        )

@router.get("/callback")
async def auth_callback(code: str):
    try:
        logger.info("Received OAuth callback")
        # You can either:
        # 1. Redirect to a frontend success page with the code
        return RedirectResponse(url=f"/oauth-success.html?code={code}")
        # OR
        # 2. Return JSON response for frontend to handle
        # return {
        #     "status": "success",
        #     "message": "Authorization successful",
        #     "auth_code": code
        # }
    except Exception as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"OAuth callback failed: {str(e)}"
        )
