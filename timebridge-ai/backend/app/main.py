from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from services.firebase.firebase_service import initialize_firebase
from dotenv import load_dotenv
import os
import logging
from app.api.chat_controller import router as chat_router
from app.api.calendar_controller import router as calendar_router
from app.api.auth_controller import router as auth_router
from app.api.user_controller import router as user_router
import uvicorn

# Load environment variables from .env file
load_dotenv()

# Verify required environment variables
required_vars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
]

missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Initialize Firebase first
initialize_firebase()

# Create FastAPI app
app = FastAPI(
    title="TimeBridgeAI API",
    description="AI-powered calendar management through natural conversation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "https://timebridgeai.web.app",
        "https://timebridgeai.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add this after your CORS middleware
@app.middleware("http")
async def log_requests(request, call_next):
    logger.debug(f"Request path: {request.url.path}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response

# Include routers
app.include_router(user_router, prefix="/api/user", tags=["user"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["calendar"])

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port) 