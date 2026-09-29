# syntax=docker/dockerfile:1
# ── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/dashboard/admin

COPY dashboard/admin/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY dashboard/admin/ ./
RUN npm run build

# ── Stage 2: Python Builder ──────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Stage 3: Final Runtime ───────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed wheels and binaries from builder
COPY --from=builder /root/.local /root/.local

# Copy application source
COPY . .

# Copy built frontend assets from frontend-builder stage
COPY --from=frontend-builder /build/dashboard/admin/dist ./dashboard/admin/dist

# Ensure storage directories exist
RUN mkdir -p chroma_data

EXPOSE 8000 8501

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
