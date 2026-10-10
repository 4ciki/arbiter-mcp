#!/bin/sh
set -e

PORT="${PORT:-10000}"
echo "========================================="
echo "=== Starting Arbiter Frontend on Port $PORT ==="
echo "========================================="

# Replace listen 80 with the assigned Render port
sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/conf.d/default.conf

# Test nginx config syntax
nginx -t

# Launch nginx in foreground
exec nginx -g "daemon off;"
