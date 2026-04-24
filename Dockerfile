# Pinning the patch version (rather than the floating `:3.11-slim` tag)
# limits unexpected base-image churn and makes builds easier to bisect
# when CVE patches drop. For *fully* reproducible builds (i.e. immune to
# a tag being re-pushed upstream) also append the sha256 digest:
#   FROM python:3.11.13-slim@sha256:<digest>
# To look up the current digest:
#   docker pull python:3.11.13-slim && docker inspect python:3.11.13-slim \
#     --format='{{index .RepoDigests 0}}'
FROM python:3.11.13-slim

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
COPY bin/ ./bin/
COPY app.py gunicorn_startup.sh ./

# Build deps for flock used by bin/start (already in slim, but be explicit
# in case a future base image drops it).
RUN apt-get update && apt-get install -y --no-install-recommends util-linux \
    && rm -rf /var/lib/apt/lists/*

# Environment
ENV FLASK_APP=app.py \
    FLASK_PORT=8880 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Strip CRLF line endings that sneak in from Windows checkouts — without
# this, `#!/usr/bin/env bash\r` makes the container exit immediately with
# `env: 'bash\r': No such file or directory`.
RUN sed -i 's/\r$//' /app/gunicorn_startup.sh /app/bin/start

# Persistent data dir (mount a volume here in production)
RUN mkdir -p /app/tm-instance \
    && chmod +x /app/gunicorn_startup.sh /app/bin/start

# Drop privileges
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

EXPOSE 8880

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS "http://localhost:${FLASK_PORT}/api/health" || exit 1

ENTRYPOINT ["/app/bin/start"]
CMD ["prod"]
