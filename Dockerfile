# Multi-stage Dockerfile for Industrial Belt Monitoring

# ============ Stage 1: ML Service (Python) ============
FROM python:3.11-slim as ml-service

WORKDIR /app/ml-service

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ml-service/ .

EXPOSE 5001

CMD ["python", "app.py"]


# ============ Stage 2: Frontend (Node.js) ============
FROM node:20-alpine as frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]


# ============ Stage 3: Combined ============
FROM python:3.11-slim as production

# Install Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install OpenCV system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy ML service
COPY ml-service/ ./ml-service/
RUN pip install --no-cache-dir -r ml-service/requirements.txt

# Copy Next.js frontend
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000 5001

# Start both services
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
