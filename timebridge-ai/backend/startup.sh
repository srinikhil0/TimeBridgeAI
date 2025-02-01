#!/bin/bash

# Check if Firebase credentials exist
if [ ! -f "$FIREBASE_CREDENTIALS_PATH" ]; then
    echo "Firebase credentials file not found at $FIREBASE_CREDENTIALS_PATH"
    ls -la /workspace/
fi

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT 