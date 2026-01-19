# Use a lightweight Python base image
FROM python:3.11-slim

# Install system dependencies (ffmpeg is required for yt-dlp merging)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -U yt-dlp

# Copy the rest of the application code
COPY . .

# Expose port (Render sets $PORT env var, but good documentation)
EXPOSE 10000

# Start command using Gunicorn
# Bind to 0.0.0.0 on the port defined by Render ($PORT)
CMD gunicorn app:app --bind 0.0.0.0:$PORT
