#!/bin/bash

# The secret will be mounted at /var/run/secrets/FIREBASE_CREDENTIALS by Cloud Run
export FIREBASE_CREDENTIALS_PATH=/var/run/secrets/FIREBASE_CREDENTIALS

# Check if Firebase credentials exist
if [ ! -f "$FIREBASE_CREDENTIALS_PATH" ]; then
    echo "Firebase credentials file not found at $FIREBASE_CREDENTIALS_PATH"
    ls -la /var/run/secrets/
fi

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT 