"""Flask app factory for Transit Explorer.

Boot model (kept deliberately simple):

  • The web process is *only* responsible for serving requests.
  • Schema migrations and OBA data loading are owned by `bin/start`
    (and `flask data load` / `flask db upgrade` underneath). Web boot
    no longer mutates the schema or spawns background data threads.
  • A fresh DB will boot empty; `/api/health` will report
    `routes_loaded == 0` until `bin/start load-data` has run.

If you really need to bypass the contract for a one-off (e.g. local
hacking), set `AUTO_UPGRADE_ON_BOOT=1` to run `flask db upgrade` from
within create_app(). This is OFF by default and not used in CI/prod.
"""
import os
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

# ─── Extensions ──────────────────────────────────────────────────────
db = SQLAlchemy()
# Autogenerate flags forwarded to alembic via Flask-Migrate's configure_args:
#   compare_type           → catch column type changes
#   compare_server_default → catch default value changes
#   render_as_batch        → SQLite-safe ALTERs (no-op on Postgres)
# Without these, `flask db migrate` silently misses real model drift.
migrate = Migrate(compare_type=True, compare_server_default=True, render_as_batch=True)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120 per minute", "2000 per hour"],
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    headers_enabled=True,
)

# ─── Logging ─────────────────────────────────────────────────────────
_log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
_flask_env = os.getenv("FLASK_ENV", "").lower()
_werkzeug_level = logging.INFO if _flask_env != "production" else logging.WARNING
logging.getLogger("werkzeug").setLevel(_werkzeug_level)
for _noisy in ("urllib3", "httpx", "httpcore"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


def create_app():
    # Initialize Sentry FIRST so Flask/SQLAlchemy/logging integrations
    # patch their targets before we instantiate them. No-op if SENTRY_DSN
    # is unset.
    from app.observability import init_sentry
    init_sentry()

    app = Flask(__name__)

    # Ensure the data directory exists for the default SQLite path.
    db_dir = os.path.join(os.getcwd(), "tm-instance")
    os.makedirs(db_dir, exist_ok=True)

    default_db_path = os.path.join(db_dir, "data.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "SQLALCHEMY_DATABASE_URI", f"sqlite:///{default_db_path}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["FIREBASE_PROJECT_ID"] = os.getenv("FIREBASE_PROJECT_ID", "")

    # Init extensions
    db.init_app(app)
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    migrate.init_app(app, db, directory=migrations_dir)

    # CORS — strict in production, localhost-only in development.
    # Wildcard origins are NEVER allowed: they make CSRF + token-stealing
    # browser attacks trivially worse, and a misconfigured FLASK_ENV
    # shouldn't be enough to expose the API to every site on the web.
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    flask_env = os.getenv("FLASK_ENV", "").lower()
    if raw_origins:
        origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
        if "*" in origins:
            raise RuntimeError(
                "ALLOWED_ORIGINS=* is not permitted. List explicit origins."
            )
        logger.info("CORS allowed origins: %s", origins)
    elif flask_env == "development":
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8880",
            "http://127.0.0.1:8880",
        ]
        logger.warning(
            "FLASK_ENV=development and ALLOWED_ORIGINS unset — "
            "defaulting CORS to localhost dev origins: %s", origins,
        )
    else:
        raise RuntimeError(
            "ALLOWED_ORIGINS must be set in production. "
            "Set ALLOWED_ORIGINS=https://your-frontend.example.com "
            "(comma-separated for multiple)."
        )
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)

    limiter.init_app(app)
    _init_firebase(app)

    # Models must be imported before any query runs *or* before
    # alembic env.py reads `db.metadata`. Importing here is enough
    # — the flask CLI commands (`flask db ...`, `flask data ...`)
    # also instantiate the app via app.py.
    from app import models  # noqa: F401

    # Optional escape hatch for local hacking. Off by default; the
    # canonical entrypoint (bin/start) runs `flask db upgrade` itself
    # under a flock so workers don't race.
    if os.getenv("AUTO_UPGRADE_ON_BOOT", "0") == "1":
        with app.app_context():
            try:
                from flask_migrate import upgrade
                logger.info("[boot] AUTO_UPGRADE_ON_BOOT=1 — running flask db upgrade")
                upgrade()
            except Exception:
                logger.exception("[boot] auto-upgrade failed")

    # Blueprints + CLI
    from app.routes.api import api_blueprint
    app.register_blueprint(api_blueprint, url_prefix="/api")

    from app.cli import register_cli
    register_cli(app)

    @app.errorhandler(500)
    def handle_500_error(e):
        logger.exception("Internal server error")
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(429)
    def handle_429(e):
        return jsonify({
            "error": "Rate limit exceeded",
            "detail": getattr(e, "description", "too many requests"),
        }), 429

    # Boot timestamp is handy for /api/health.
    app.boot_at = datetime.now(timezone.utc).replace(tzinfo=None)
    return app


def _init_firebase(app):
    """Initialize Firebase Admin SDK for token verification."""
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            return

        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
            return

        project_id = app.config.get("FIREBASE_PROJECT_ID")
        if project_id:
            firebase_admin.initialize_app(options={"projectId": project_id})
        else:
            logger.warning("No Firebase credentials configured — auth will not work")
    except ImportError:
        logger.warning("firebase-admin not installed — auth will not work")
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}")
