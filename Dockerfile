FROM python:3.11-slim

WORKDIR /app

# Build deps + sqlite3 (for online backups via gunicorn_startup.sh's `sqlite3 .backup`)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first to leverage Docker layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY app/ ./app/
COPY app.py gunicorn_startup.sh ./

# Environment
ENV FLASK_APP=app.py \
    FLASK_PORT=8880 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Persistent data dir (mount a volume here in production)
RUN mkdir -p /app/tm-instance && chmod +x /app/gunicorn_startup.sh

# Drop privileges
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

EXPOSE 8880

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS "http://localhost:${FLASK_PORT}/api/health" || exit 1

ENTRYPOINT ["/app/gunicorn_startup.sh"]
