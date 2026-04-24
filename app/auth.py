import functools
import logging
from flask import request, g, jsonify
from app import db
from app.models import User

logger = logging.getLogger(__name__)


def verify_firebase_token(id_token):
    """Verify a Firebase ID token and return the decoded claims."""
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(id_token)
        return decoded
    except ImportError:
        logger.error("firebase-admin not installed")
        return None
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None


def require_auth(f):
    """Decorator that requires a valid Firebase auth token.

    Sets g.current_user to the User model instance.
    Auto-creates user on first authenticated request.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401

        token = auth_header[7:]  # strip "Bearer "
        claims = verify_firebase_token(token)
        if not claims:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # firebase-admin always sets `uid` on a verified ID token.
        # Don't accept the unverified `user_id` claim as a fallback.
        firebase_uid = claims.get('uid')
        if not firebase_uid or not isinstance(firebase_uid, str):
            logger.warning('Token verified but missing uid claim')
            return jsonify({'error': 'Invalid token claims'}), 401

        # Find or create user
        user = User.query.filter_by(firebase_uid=firebase_uid).first()
        if not user:
            user = User(
                firebase_uid=firebase_uid,
                email=claims.get('email', ''),
                display_name=claims.get('name', ''),
                avatar_url=claims.get('picture', ''),
            )
            db.session.add(user)
            db.session.commit()
            logger.info(f"Created new user: {user.email} (uid={firebase_uid})")

        g.current_user = user
        # Tag Sentry events with the Firebase UID for this request.
        try:
            from app.observability import set_sentry_user
            set_sentry_user(user.firebase_uid, user.email)
        except Exception:
            pass
        return f(*args, **kwargs)

    return decorated
