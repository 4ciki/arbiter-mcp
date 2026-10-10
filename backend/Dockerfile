# syntax=docker/dockerfile:1
# ── Backend-only Dockerfile ───────────────────────────────────────────────────
# Deploys the FastAPI + MCP server.  No frontend assets are bundled here;
# the React SPA is deployed as a separate Render Static Site / Web Service.

# ── Stage 1: Python Builder ──────────────────────────────────────────────────
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

# ── Stage 2: Final Runtime ───────────────────────────────────────────────────
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

# Copy application source (entire backend folder)
COPY . .

# Ensure storage directories exist
RUN mkdir -p chroma_data

EXPOSE 8000

# Health check for Render / container probes
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
