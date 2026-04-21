import os
import logging
import threading
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect

load_dotenv()  # Load .env from project root

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120 per minute", "2000 per hour"],
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    headers_enabled=True,
)

# Set up logging — level is configurable via LOG_LEVEL env var
_log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
# Quiet down noisy third-party loggers
for _noisy in ("werkzeug", "urllib3", "httpx", "httpcore"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    # Track when the background transit-data load last completed (None = never).
    app.last_data_load_at = None
    app.last_data_load_error = None
    # Accept either env var name; SKIP_DATA_LOAD is the legacy name shared
    # with gunicorn_startup.sh. Both control the in-process background loader.
    skip_startup_data_tasks = (
        os.getenv("SKIP_STARTUP_DATA_TASKS", "0") == "1"
        or os.getenv("SKIP_DATA_LOAD", "0") == "1"
    )

    # Ensure database directory exists
    db_dir = os.path.join(os.getcwd(), "tm-instance")
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    # Load configuration
    default_db_path = os.path.join(db_dir, "data.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "SQLALCHEMY_DATABASE_URI", f"sqlite:///{default_db_path}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["FIREBASE_PROJECT_ID"] = os.getenv("FIREBASE_PROJECT_ID", "")

    # Initialize Flask extensions
    db.init_app(app)

    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    migrate.init_app(app, db, directory=migrations_dir)

    # Enable CORS — restrict to ALLOWED_ORIGINS in production.
    # Comma-separated list, e.g. "https://transit.example.com,https://staging.example.com".
    # Falls back to "*" only when FLASK_ENV=development for convenience.
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    flask_env = os.getenv("FLASK_ENV", "").lower()
    if raw_origins:
        origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
        logger.info("CORS allowed origins: %s", origins)
    elif flask_env == "development":
        origins = "*"
        logger.info("FLASK_ENV=development — CORS allowing all origins.")
    else:
        # Fail-fast in production: refuse to boot with an unsafe default.
        raise RuntimeError(
            "ALLOWED_ORIGINS must be set in production. "
            "Set ALLOWED_ORIGINS=https://your-frontend.example.com (comma-separated for multiple)."
        )
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)

    # Rate limiting (must init after app exists)
    limiter.init_app(app)

    # Initialize Firebase Admin SDK
    _init_firebase(app)

    # Run alembic migrations (idempotent; self-heals legacy DBs that
    # predate alembic). Must happen BEFORE we query any user tables in
    # the data-init block below, otherwise a stale schema raises
    # OperationalError on missing columns.
    if os.getenv("SKIP_DB_UPGRADE", "0") != "1":
        with app.app_context():
            _run_migrations(app)

    # Register blueprints
    from app.routes.api import api_blueprint
    app.register_blueprint(api_blueprint, url_prefix="/api")

    @app.errorhandler(500)
    def handle_500_error(e):
        # Log full traceback server-side; never leak exception details to clients.
        logger.exception("Internal server error")
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(429)
    def handle_429(e):
        return jsonify({
            "error": "Rate limit exceeded",
            "detail": getattr(e, "description", "too many requests"),
        }), 429

    # Initialize data if needed
    if skip_startup_data_tasks:
        logger.info("SKIP_STARTUP_DATA_TASKS=1 — skipping startup transit data checks.")
    else:
        with app.app_context():
            try:
                # Import models so they're registered
                from app import models  # noqa: F401

                inspector = inspect(db.engine)
                if not inspector.has_table("routes"):
                    logger.info("Routes table not found, creating tables...")
                    db.create_all()

                    logger.info("Loading initial transit data in background...")
                    _start_background_data_load(app)
                else:
                    # Check if directions data is properly populated
                    from app.models import RouteDirection
                    dir_count = RouteDirection.query.count()
                    dirs_with_stops = RouteDirection.query.filter(
                        RouteDirection.stop_ids_json != None,
                        RouteDirection.stop_ids_json != '',
                        RouteDirection.stop_ids_json != '[]'
                    ).count()

                    if dirs_with_stops == 0:
                        logger.info(f"Found {dir_count} directions but none have stop_ids — reloading in background...")
                        _start_background_data_load(app)
                    else:
                        # Always run a per-route backfill to pick up any routes
                        # that are missing from the DB (e.g. a previous load
                        # errored on individual route_ids). It's cheap when
                        # everything is already present (one OBA call per agency).
                        logger.info(f"Routes table OK ({dirs_with_stops}/{dir_count} directions with stops); running missing-route backfill in background.")
                        _start_background_backfill(app)
            except Exception as e:
                logger.error(f"Error during initialization: {e}")
                db.create_all()

    return app


def _start_background_data_load(app, agency_ids=None):
    """Load transit data in a background thread so the server can start immediately."""

    def _load():
        with app.app_context():
            try:
                from app.data_loader import load_transit_data
                load_transit_data(agency_ids=agency_ids)
                app.last_data_load_at = datetime.utcnow()
                app.last_data_load_error = None
                logger.info("Background data load finished successfully.")
            except Exception as e:
                app.last_data_load_error = str(e)[:200]
                logger.exception("Background data load failed")

    t = threading.Thread(target=_load, daemon=True, name="oba-data-load")
    t.start()


def _start_background_backfill(app):
    """Run the per-route backfill in a background thread."""

    def _run():
        with app.app_context():
            try:
                from app.data_loader import backfill_missing_routes
                backfill_missing_routes()
                app.last_data_load_at = datetime.utcnow()
                app.last_data_load_error = None
            except Exception as e:
                app.last_data_load_error = str(e)[:200]
                logger.exception("Background backfill failed")

    t = threading.Thread(target=_run, daemon=True, name="oba-backfill")
    t.start()


# Baseline alembic revision — represents the schema as-of when alembic
# was first introduced. Used to stamp legacy DBs whose tables were
# created via `db.create_all()` before migrations existed.
_ALEMBIC_BASELINE_REV = "f838d5f10e83"


def _run_migrations(app):
    """Bring the database schema up to date.

    Self-heals two common situations:
      1. Brand-new DB — `flask db upgrade` creates everything.
      2. Legacy DB whose tables exist but `alembic_version` does not
         (created via db.create_all() before alembic was added). We
         stamp the baseline first so `upgrade` only applies *new*
         migrations instead of re-running CREATE TABLEs.

    Any failure is logged but does NOT prevent the app from starting,
    so health checks can still respond while you investigate.
    """
    try:
        from flask_migrate import stamp, upgrade

        inspector = inspect(db.engine)
        tables = set(inspector.get_table_names())

        if not tables:
            logger.info("[migrate] empty database — running full upgrade")
        else:
            has_app_tables = "user_segments" in tables or "routes" in tables
            has_alembic = "alembic_version" in tables
            if has_app_tables and not has_alembic:
                logger.info(
                    "[migrate] legacy DB detected (no alembic_version) — "
                    "stamping baseline %s",
                    _ALEMBIC_BASELINE_REV,
                )
                stamp(revision=_ALEMBIC_BASELINE_REV)

        logger.info("[migrate] running flask db upgrade …")
        upgrade()
        logger.info("[migrate] migrations done")
    except Exception:
        logger.exception(
            "[migrate] migration step failed — schema may be out of date"
        )


def _init_firebase(app):
    """Initialize Firebase Admin SDK for token verification."""
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            # Use GOOGLE_APPLICATION_CREDENTIALS env var if set,
            # otherwise initialize with project ID only
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                project_id = app.config.get("FIREBASE_PROJECT_ID")
                if project_id:
                    firebase_admin.initialize_app(options={"projectId": project_id})
                else:
                    logger.warning("No Firebase credentials configured — auth will not work")
    except ImportError:
        logger.warning("firebase-admin not installed — auth will not work")
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}")
