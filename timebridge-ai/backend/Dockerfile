FROM python:3.9-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create directory for Firebase credentials
RUN mkdir -p /workspace

ENV PORT=8080
ENV FIREBASE_CREDENTIALS_PATH=/workspace/firebase-credentials.json

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"] 