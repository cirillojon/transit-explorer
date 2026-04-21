import os


class Config:
    """Static fallback config. The Flask app factory reads env vars directly,
    so this is mainly here for tests and ad-hoc imports."""

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        os.getenv("DATABASE_URL", "sqlite:///tm-instance/data.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OBA_API_KEY = os.getenv("OBA_API_KEY", "")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
