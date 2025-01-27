from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from services.firebase_service import initialize_firebase
from dotenv import load_dotenv
import os
import logging
from api.chat_controller import router as chat_router

# Load environment variables
load_dotenv()

# Initialize Firebase first
initialize_firebase()

# Then create FastAPI app
app = FastAPI(
    title="TimeBridgeAI API",
    description="AI-powered calendar management through natural conversation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

# Import routes after Firebase is initialized
from app.api import chat_controller, calendar_controller, auth_controller

# Include routers
app.include_router(auth_controller.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat_router, prefix="/api")
app.include_router(calendar_controller.router, prefix="/api/calendar", tags=["Calendar"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "TimeBridgeAI"} 