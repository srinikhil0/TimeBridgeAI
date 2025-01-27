from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from firebase_admin import auth

router = APIRouter()

class AuthRequest(BaseModel):
    id_token: str

class AuthResponse(BaseModel):
    uid: str
    email: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

@router.post("/verify", response_model=AuthResponse)
async def verify_token(request: AuthRequest):
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(request.id_token)
        
        # Get user details
        user = auth.get_user(decoded_token['uid'])
        
        return AuthResponse(
            uid=user.uid,
            email=user.email,
            access_token=decoded_token.get('access_token'),
            refresh_token=decoded_token.get('refresh_token')
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}"
        )
