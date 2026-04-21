import json
import os
import time
import logging
import requests
from datetime import datetime, timedelta, timezone

from app import db
from app.models import (
    Route, Stop, RouteDirection, RouteStop, User, DataLoad,
)
from app.oba_service import fetch_routes_for_agency, fetch_stops_for_route, AGENCIES

logger = logging.getLogger(__name__)

REQUEST_DELAY = 0.8
MAX_RETRIES = 5
COMMIT_BATCH = 25

_RETRYABLE_EXCEPTIONS = (
    requests.RequestException,
    TimeoutError,
    ConnectionError,
)


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _call_with_backoff(fn, *args, label=""):
    for attempt in range(MAX_RETRIES):
        try:
            return fn(*args)
        except _RETRYABLE_EXCEPTIONS as e:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                logger.warning("Retryable error on %s: %s, waiting %ss (attempt %d/%d)",
                               label, str(e)[:80], wait, attempt + 1, MAX_RETRIES)
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            err_str = str(e)
            is_retryable = ("429" in err_str
                            or "timeout" in err_str.lower()
                            or "timed out" in err_str.lower())
            if is_retryable and attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                logger.warning("Retryable error on %s: %s, waiting %ss (attempt %d/%d)",
                               label, err_str[:80], wait, attempt + 1, MAX_RETRIES)
                time.sleep(wait)
            else:
                raise


def load_transit_data(agency_ids=None, force=False, ttl_hours=None):
    """Refresh transit data for the requested agencies (TTL gated)."""
    if ttl_hours is None:
        try:
            ttl_hours = float(os.getenv("OBA_REFRESH_TTL_HOURS", "24"))
        except ValueError:
            ttl_hours = 24.0
    targets = list(agency_ids) if agency_ids else list(AGENCIES)
    logger.info("OBA load: agencies=%s force=%s ttl=%sh", targets, force, ttl_hours)
    results = {}
    for agency_id in targets:
        results[agency_id] = _refresh_agency(agency_id, force=force, ttl_hours=ttl_hours)
    return results


def status():
    return [r.to_dict() for r in DataLoad.query.order_by(DataLoad.agency_id).all()]


def _refresh_agency(agency_id, *, force, ttl_hours):
    state = _get_or_create_state(agency_id)
    if (not force and state.last_success_at is not None
            and _utcnow() - state.last_success_at < timedelta(hours=ttl_hours)):
        logger.info("Agency %s: last success %s - within TTL, skipping",
                    agency_id, state.last_success_at.isoformat())
        return {"loaded": 0, "skipped": True, "error": None}

    state.last_attempt_at = _utcnow()
    db.session.commit()

    try:
        oba_routes = _call_with_backoff(
            fetch_routes_for_agency, agency_id,
            label=f"routes-for-agency/{agency_id}")
    except Exception as e:
        logger.exception("Agency %s: failed to list routes", agency_id)
        state = _get_or_create_state(agency_id)
        state.last_error = str(e)[:500]
        db.session.commit()
        return {"loaded": 0, "skipped": False, "error": str(e)}

    existing_route_ids = {
        rid for (rid,) in db.session.query(Route.id)
        .filter(Route.agency_id == agency_id).all()
    }
    routes_with_dirs = {
        rid for (rid,) in db.session.query(RouteDirection.route_id)
        .join(Route, Route.id == RouteDirection.route_id)
        .filter(Route.agency_id == agency_id).distinct().all()
    }

    if force:
        to_load = list(oba_routes)
    else:
        to_load = [r for r in oba_routes
                   if r['id'] not in existing_route_ids
                   or r['id'] not in routes_with_dirs]

    logger.info("Agency %s: %d/%d routes need refresh (force=%s)",
                agency_id, len(to_load), len(oba_routes), force)

    loaded = 0
    error = None
    pending = 0
    for route_data in to_load:
        route_id = route_data['id']
        try:
            _upsert_route(route_data)
            time.sleep(REQUEST_DELAY)
            stops_data = _call_with_backoff(
                fetch_stops_for_route, route_id,
                label=f"stops-for-route/{route_id}")
            _process_route_stops(route_id, stops_data)
            loaded += 1
            pending += 1
            if pending >= COMMIT_BATCH:
                db.session.commit()
                pending = 0
        except Exception as e:
            logger.exception("Agency %s: error on route %s", agency_id, route_id)
            db.session.rollback()
            error = str(e)
            continue

    if pending:
        db.session.commit()

    state = _get_or_create_state(agency_id)
    state.route_count = (
        db.session.query(Route.id).filter(Route.agency_id == agency_id).count())
    if error is None:
        state.last_success_at = _utcnow()
        state.last_error = None
    else:
        state.last_error = error[:500]
    db.session.commit()

    logger.info("Agency %s: refresh done - %d routes touched, total=%d, error=%s",
                agency_id, loaded, state.route_count, error)
    return {"loaded": loaded, "skipped": False, "error": error}


def _get_or_create_state(agency_id):
    state = db.session.get(DataLoad, agency_id)
    if state is None:
        state = DataLoad(agency_id=agency_id, route_count=0)
        db.session.add(state)
        db.session.flush()
    return state


def _upsert_route(route_data):
    route = db.session.get(Route, route_data['id'])
    if route:
        for k in ('agency_id', 'short_name', 'long_name', 'description',
                  'route_type', 'color', 'text_color', 'url'):
            setattr(route, k, route_data[k])
    else:
        db.session.add(Route(**route_data))
    db.session.flush()


def _process_route_stops(route_id, stops_data):
    stops_map = stops_data.get('stops', {})
    directions = stops_data.get('directions', [])
    for stop_id, stop_info in stops_map.items():
        _upsert_stop(stop_info)
    for dir_data in directions:
        _upsert_direction(route_id, dir_data)
        for seq, stop_id in enumerate(dir_data['stop_ids']):
            _upsert_route_stop(route_id, stop_id, dir_data['direction_id'], seq)
    db.session.flush()


def _upsert_stop(stop_info):
    stop = db.session.get(Stop, stop_info['id'])
    if stop:
        stop.name = stop_info['name']
        stop.code = stop_info.get('code', '')
        stop.lat = stop_info['lat']
        stop.lon = stop_info['lon']
        stop.direction = stop_info.get('direction', '')
        stop.location_type = stop_info.get('location_type', 0)
    else:
        db.session.add(Stop(
            id=stop_info['id'], name=stop_info['name'],
            code=stop_info.get('code', ''), lat=stop_info['lat'],
            lon=stop_info['lon'], direction=stop_info.get('direction', ''),
            location_type=stop_info.get('location_type', 0)))


def _upsert_direction(route_id, dir_data):
    existing = RouteDirection.query.filter_by(
        route_id=route_id, direction_id=dir_data['direction_id']).first()
    stop_ids_json = json.dumps(dir_data['stop_ids'])
    if existing:
        existing.direction_name = dir_data['direction_name']
        existing.encoded_polyline = dir_data['encoded_polyline']
        existing.stop_ids_json = stop_ids_json
    else:
        db.session.add(RouteDirection(
            route_id=route_id,
            direction_id=dir_data['direction_id'],
            direction_name=dir_data['direction_name'],
            encoded_polyline=dir_data['encoded_polyline'],
            stop_ids_json=stop_ids_json))


def _upsert_route_stop(route_id, stop_id, direction_id, stop_sequence):
    existing = RouteStop.query.filter_by(
        route_id=route_id, stop_id=stop_id, direction_id=direction_id).first()
    if existing:
        existing.stop_sequence = stop_sequence
    else:
        db.session.add(RouteStop(
            route_id=route_id, stop_id=stop_id,
            direction_id=direction_id, stop_sequence=stop_sequence))


def create_user(firebase_uid, email, display_name, avatar_url):
    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    if not user:
        user = User(firebase_uid=firebase_uid, email=email,
                    display_name=display_name, avatar_url=avatar_url)
        db.session.add(user)
        db.session.commit()
    else:
        updated = False
        if user.email != email:
            user.email = email
            updated = True
        if user.display_name != display_name:
            user.display_name = display_name
            updated = True
        if user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
            updated = True
        if updated:
            db.session.commit()
