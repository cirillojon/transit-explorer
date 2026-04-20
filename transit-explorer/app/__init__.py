import os
import logging
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect

load_dotenv()  # Load .env from project root

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

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
    if raw_origins:
        origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    elif os.getenv("FLASK_ENV", "").lower() == "development":
        origins = "*"
    else:
        origins = []  # explicit deny if not configured for prod
        logger.warning(
            "ALLOWED_ORIGINS is not set — CORS will reject all browser origins. "
            "Set ALLOWED_ORIGINS=https://your-frontend.example.com for production."
        )
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)

    # Initialize Firebase Admin SDK
    _init_firebase(app)

    # Register blueprints
    from app.routes.api import api_blueprint
    app.register_blueprint(api_blueprint, url_prefix="/api")

    @app.errorhandler(500)
    def handle_500_error(e):
        logger.error(f"Internal server error: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    # Initialize data if needed
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
                    logger.info(f"Routes table found with {dirs_with_stops}/{dir_count} directions with stops, skipping data load.")
        except Exception as e:
            logger.error(f"Error during initialization: {e}")
            db.create_all()

    return app


def _start_background_data_load(app):
    """Load transit data in a background thread so the server can start immediately."""
    import threading

    def _load():
        with app.app_context():
            try:
                from app.data_loader import load_transit_data
                load_transit_data()
                logger.info("Background data load finished successfully.")
            except Exception as e:
                logger.error(f"Background data load failed: {e}")

    t = threading.Thread(target=_load, daemon=True)
    t.start()


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
