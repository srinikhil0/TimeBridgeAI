from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from firebase_admin import firestore
from services.firebase import get_current_user
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class UserPreferences(BaseModel):
    calendarAccess: bool
    lastUpdated: str | None = None

@router.get("/preferences")
async def get_preferences(current_user = Depends(get_current_user)):
    try:
        db = firestore.client()
        user_id = current_user.get('uid')  # Access uid from dictionary
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
            
        user_prefs = db.collection('userPreferences').document(user_id).get()
        
        if not user_prefs.exists:
            return {
                "calendarAccess": False,
                "lastUpdated": None
            }
        
        prefs_dict = user_prefs.to_dict()
        return {
            "calendarAccess": prefs_dict.get('calendarAccess', False),
            "lastUpdated": prefs_dict.get('lastUpdated')
        }
    except Exception as e:
        logger.error(f"Failed to fetch preferences: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/preferences")
async def update_preferences(
    preferences: UserPreferences,
    current_user = Depends(get_current_user)
):
    try:
        db = firestore.client()
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
            
        user_ref = db.collection('userPreferences').document(user_id)
        
        user_ref.set({
            'calendarAccess': preferences.calendarAccess,
            'lastUpdated': datetime.utcnow().isoformat()
        }, merge=True)
        
        return {
            'calendarAccess': preferences.calendarAccess,
            'lastUpdated': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to update preferences: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update preferences") 