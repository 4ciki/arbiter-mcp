# syntax=docker/dockerfile:1
# ── Frontend Dockerfile ────────────────────────────────────────────────────────
# Two-stage build:
#   1. Node — builds the Vite/React SPA into static files
#   2. nginx — serves the compiled static files with SPA routing
#
# Environment variables injected at build time via --build-arg:
#   VITE_API_URL  — full URL of the deployed backend (e.g. https://arbiter-mcp-backend.onrender.com)
#   VITE_FIREBASE_*  — Firebase project config

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Declare build-time args (passed via Render → Environment / docker build --build-arg)
ARG VITE_API_URL=https://arbiter-mcp-backend.onrender.com
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# Expose them as env vars so Vite picks them up during build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

ENV PORT=10000

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80 10000

ENTRYPOINT []
CMD ["/bin/sh", "/start.sh"]
