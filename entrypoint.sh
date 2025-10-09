#!/usr/bin/env bash
set -e

# Default PORT if not set by environment (Cloud Run sets PORT=8080)
PORT=${PORT:-8080}

echo "Starting entrypoint: port=${PORT}"

# Run DB migrations here if you use Alembic/Flask-Migrate
# Example:
# if [ -f alembic.ini ]; then
#   alembic upgrade head
# fi

exec gunicorn --bind 0.0.0.0:${PORT} "app:app"
