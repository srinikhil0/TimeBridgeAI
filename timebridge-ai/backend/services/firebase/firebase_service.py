from firebase_admin import auth, credentials, initialize_app
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging
from typing import Optional

security = HTTPBearer()

logger = logging.getLogger(__name__)

# Initialize Firebase with credentials
def initialize_firebase():
    cred = credentials.Certificate(os.getenv('FIREBASE_CREDENTIALS_PATH'))
    initialize_app(cred)

async def get_current_user(request: Request):
    try:
        authorization = request.headers.get("Authorization")
        if not authorization:
            logger.error("No Authorization header found")
            raise HTTPException(status_code=401, detail="No authorization header")
            
        if not authorization.startswith("Bearer "):
            logger.error("Invalid authorization format")
            raise HTTPException(status_code=401, detail="Invalid authorization format")

        token = authorization.split(" ")[1]
        logger.debug("Attempting to verify token")
        
        try:
            decoded_token = auth.verify_id_token(token)
            logger.debug(f"Token verified successfully for user: {decoded_token.get('email')}")
            return decoded_token
        except auth.InvalidIdTokenError:
            logger.error("Token validation failed: Invalid token")
            raise HTTPException(status_code=401, detail="Invalid token")
        except auth.ExpiredIdTokenError:
            logger.error("Token validation failed: Token expired")
            raise HTTPException(status_code=401, detail="Token expired")
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            raise HTTPException(status_code=401, detail="Token validation failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_user_details(decoded_token: dict) -> dict:
    """Get detailed user information from a decoded token"""
    try:
        user = auth.get_user(decoded_token['uid'])
        return {
            'uid': user.uid,
            'email': user.email,
            'display_name': user.display_name,
            'credentials': decoded_token.get('firebase', {}).get('sign_in_provider'),
            'calendar_access': decoded_token.get('calendar_access', False)
        }
    except Exception as e:
        logger.error(f"Failed to get user details: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Failed to get user details"
        )
