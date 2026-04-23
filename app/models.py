from datetime import datetime
from app import db
import json


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120))
    display_name = db.Column(db.String(120))
    avatar_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    segments = db.relationship('UserSegment', backref='user', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'firebase_uid': self.firebase_uid,
            'email': self.email,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Route(db.Model):
    __tablename__ = 'routes'

    id = db.Column(db.String(50), primary_key=True)
    agency_id = db.Column(db.String(50))
    short_name = db.Column(db.String(50))
    long_name = db.Column(db.String(255))
    description = db.Column(db.String(500))
    route_type = db.Column(db.Integer)
    color = db.Column(db.String(6))
    text_color = db.Column(db.String(6))
    url = db.Column(db.String(500))

    directions = db.relationship('RouteDirection', backref='route', lazy='dynamic')
    route_stops = db.relationship('RouteStop', backref='route', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'agency_id': self.agency_id,
            'short_name': self.short_name,
            'long_name': self.long_name,
            'description': self.description,
            'route_type': self.route_type,
            'color': self.color,
            'text_color': self.text_color,
            'url': self.url,
        }

    def to_dict_full(self):
        d = self.to_dict()
        d['directions'] = [rd.to_dict() for rd in self.directions]
        return d


class Stop(db.Model):
    __tablename__ = 'stops'

    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(255))
    code = db.Column(db.String(50))
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    direction = db.Column(db.String(10))
    location_type = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'lat': self.lat,
            'lon': self.lon,
            'direction': self.direction,
        }


class RouteDirection(db.Model):
    __tablename__ = 'route_directions'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.String(50), db.ForeignKey('routes.id'), nullable=False)
    direction_id = db.Column(db.String(10), nullable=False)
    direction_name = db.Column(db.String(255))
    encoded_polyline = db.Column(db.Text)
    # JSON-encoded list of all polyline variants for this direction. OBA
    # returns one polyline per trip-pattern variant (deviations,
    # short-turns, etc.); storing only the first one — as we used to —
    # leaves stops on minor patterns visually disconnected from the route.
    encoded_polylines_json = db.Column(db.Text)
    stop_ids_json = db.Column(db.Text)  # JSON array of ordered stop IDs

    __table_args__ = (
        db.UniqueConstraint('route_id', 'direction_id', name='uq_route_direction'),
    )

    def to_dict(self):
        try:
            stop_ids = json.loads(self.stop_ids_json) if self.stop_ids_json else []
        except (ValueError, TypeError):
            stop_ids = []
        # Guard against malformed JSON in either column so a single bad
        # row can't 500 every endpoint that serializes directions.
        try:
            encoded_polylines = (
                json.loads(self.encoded_polylines_json)
                if self.encoded_polylines_json else []
            )
        except (ValueError, TypeError):
            encoded_polylines = []
        if not isinstance(encoded_polylines, list):
            encoded_polylines = []
        # Back-compat: if the variant list wasn't populated yet (older
        # rows from before the migration ran end-to-end), surface the
        # single legacy polyline so the frontend always has something
        # to draw.
        if not encoded_polylines and self.encoded_polyline:
            encoded_polylines = [self.encoded_polyline]
        return {
            'id': self.id,
            'route_id': self.route_id,
            'direction_id': self.direction_id,
            'direction_name': self.direction_name,
            'encoded_polyline': self.encoded_polyline,
            'encoded_polylines': encoded_polylines,
            'stop_ids': stop_ids,
        }


class RouteStop(db.Model):
    __tablename__ = 'route_stops'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.String(50), db.ForeignKey('routes.id'), nullable=False)
    stop_id = db.Column(db.String(50), db.ForeignKey('stops.id'), nullable=False)
    direction_id = db.Column(db.String(10), nullable=False)
    stop_sequence = db.Column(db.Integer, nullable=False)

    stop = db.relationship('Stop', lazy='joined')

    __table_args__ = (
        db.UniqueConstraint('route_id', 'stop_id', 'direction_id', name='uq_route_stop_dir'),
    )


class UserSegment(db.Model):
    __tablename__ = 'user_segments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    route_id = db.Column(db.String(50), db.ForeignKey('routes.id'), nullable=False)
    direction_id = db.Column(db.String(10), nullable=False)
    from_stop_id = db.Column(db.String(50), db.ForeignKey('stops.id'), nullable=False)
    to_stop_id = db.Column(db.String(50), db.ForeignKey('stops.id'), nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    # Optional measured trip duration in milliseconds. Captured client-side
    # between the boarding and alighting taps; only ever set on the first
    # row of a multi-segment run. Editable later via the API.
    duration_ms = db.Column(db.Integer, nullable=True)

    route = db.relationship('Route', lazy='joined')
    from_stop = db.relationship('Stop', foreign_keys=[from_stop_id], lazy='joined')
    to_stop = db.relationship('Stop', foreign_keys=[to_stop_id], lazy='joined')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'route_id', 'direction_id', 'from_stop_id', 'to_stop_id',
                            name='uq_user_segment'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'route_id': self.route_id,
            'direction_id': self.direction_id,
            'from_stop_id': self.from_stop_id,
            'to_stop_id': self.to_stop_id,
            'from_stop_name': self.from_stop.name if self.from_stop else None,
            'to_stop_name': self.to_stop.name if self.to_stop else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'duration_ms': self.duration_ms,
        }


class DataLoad(db.Model):
    """Per-agency snapshot of the last OneBusAway data import.

    One row per agency. Persisted across restarts so the loader can:
      • short-circuit recent successful loads (TTL),
      • surface real status on /api/health (no in-memory state),
      • make load history visible to operators.
    """
    __tablename__ = 'data_loads'

    agency_id = db.Column(db.String(50), primary_key=True)
    last_attempt_at = db.Column(db.DateTime)
    last_success_at = db.Column(db.DateTime)
    route_count = db.Column(db.Integer, default=0)
    last_error = db.Column(db.Text)

    def to_dict(self):
        return {
            'agency_id': self.agency_id,
            'last_attempt_at': self.last_attempt_at.isoformat() if self.last_attempt_at else None,
            'last_success_at': self.last_success_at.isoformat() if self.last_success_at else None,
            'route_count': self.route_count or 0,
            'last_error': self.last_error,
        }
