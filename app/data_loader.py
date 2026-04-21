import json
import time
import logging
from app import db
from app.models import Route, Stop, RouteDirection, RouteStop, User
from app.oba_service import fetch_routes_for_agency, fetch_stops_for_route, AGENCIES

logger = logging.getLogger(__name__)

REQUEST_DELAY = 0.8  # seconds between OBA API calls
MAX_RETRIES = 5


def _call_with_backoff(fn, *args, label=""):
    """Call an OBA API function with exponential backoff on errors."""
    for attempt in range(MAX_RETRIES):
        try:
            return fn(*args)
        except Exception as e:
            err_str = str(e)
            is_retryable = "429" in err_str or "timeout" in err_str.lower() or "timed out" in err_str.lower()
            if is_retryable and attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
                logger.warning(f"Retryable error on {label}: {err_str[:80]}, waiting {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
            else:
                raise


def load_transit_data(agency_ids=None):
    """Load all transit routes, stops, and directions from the OneBusAway API.

    If agency_ids is None, loads every agency in AGENCIES. Pass a subset to
    backfill only the agencies that are missing from the database.
    """
    targets = list(agency_ids) if agency_ids else list(AGENCIES)
    logger.info(f"Starting transit data load from OneBusAway API for agencies={targets}")

    total_routes = 0
    total_stops = 0

    for agency_id in targets:
        logger.info(f"Fetching routes for agency {agency_id}")
        try:
            routes = _call_with_backoff(fetch_routes_for_agency, agency_id, label=f"routes-for-agency/{agency_id}")
        except Exception as e:
            logger.error(f"Failed to fetch routes for agency {agency_id}: {e}")
            continue

        logger.info(f"Found {len(routes)} routes for agency {agency_id}")

        for i, route_data in enumerate(routes):
            route_id = route_data['id']
            try:
                _upsert_route(route_data)
                total_routes += 1

                time.sleep(REQUEST_DELAY)

                stops_data = _call_with_backoff(fetch_stops_for_route, route_id, label=f"stops-for-route/{route_id}")
                _process_route_stops(route_id, stops_data)
                total_stops += len(stops_data.get('stops', {}))

                logger.info(f"  Processed {i + 1}/{len(routes)} routes for agency {agency_id} [{route_id}]")
                if (i + 1) % 10 == 0:
                    db.session.commit()

            except Exception as e:
                logger.error(f"Error processing route {route_id}: {e}")
                db.session.rollback()
                continue

        db.session.commit()
        logger.info(f"Finished agency {agency_id}: {len(routes)} routes processed")

    db.session.commit()
    logger.info(f"Transit data load complete: {total_routes} routes, {total_stops} stops")


def _upsert_route(route_data):
    """Insert or update a route record."""
    route = Route.query.get(route_data['id'])
    if route:
        route.agency_id = route_data['agency_id']
        route.short_name = route_data['short_name']
        route.long_name = route_data['long_name']
        route.description = route_data['description']
        route.route_type = route_data['route_type']
        route.color = route_data['color']
        route.text_color = route_data['text_color']
        route.url = route_data['url']
    else:
        route = Route(**route_data)
        db.session.add(route)
    db.session.flush()


def _process_route_stops(route_id, stops_data):
    """Process direction groupings and stops for a single route."""
    stops_map = stops_data.get('stops', {})
    directions = stops_data.get('directions', [])

    # Upsert all stops referenced by this route
    for stop_id, stop_info in stops_map.items():
        _upsert_stop(stop_info)

    # Upsert direction groupings
    for dir_data in directions:
        _upsert_direction(route_id, dir_data)

        # Create RouteStop entries with sequence numbers
        for seq, stop_id in enumerate(dir_data['stop_ids']):
            _upsert_route_stop(route_id, stop_id, dir_data['direction_id'], seq)

    db.session.flush()


def _upsert_stop(stop_info):
    """Insert or update a stop record."""
    stop = Stop.query.get(stop_info['id'])
    if stop:
        stop.name = stop_info['name']
        stop.code = stop_info.get('code', '')
        stop.lat = stop_info['lat']
        stop.lon = stop_info['lon']
        stop.direction = stop_info.get('direction', '')
        stop.location_type = stop_info.get('location_type', 0)
    else:
        stop = Stop(
            id=stop_info['id'],
            name=stop_info['name'],
            code=stop_info.get('code', ''),
            lat=stop_info['lat'],
            lon=stop_info['lon'],
            direction=stop_info.get('direction', ''),
            location_type=stop_info.get('location_type', 0),
        )
        db.session.add(stop)


def _upsert_direction(route_id, dir_data):
    """Insert or update a route direction record."""
    existing = RouteDirection.query.filter_by(
        route_id=route_id, direction_id=dir_data['direction_id']
    ).first()

    stop_ids_json = json.dumps(dir_data['stop_ids'])

    if existing:
        existing.direction_name = dir_data['direction_name']
        existing.encoded_polyline = dir_data['encoded_polyline']
        existing.stop_ids_json = stop_ids_json
    else:
        rd = RouteDirection(
            route_id=route_id,
            direction_id=dir_data['direction_id'],
            direction_name=dir_data['direction_name'],
            encoded_polyline=dir_data['encoded_polyline'],
            stop_ids_json=stop_ids_json,
        )
        db.session.add(rd)


def _upsert_route_stop(route_id, stop_id, direction_id, stop_sequence):
    """Insert or update a route-stop relationship."""
    existing = RouteStop.query.filter_by(
        route_id=route_id, stop_id=stop_id, direction_id=direction_id
    ).first()

    if existing:
        existing.stop_sequence = stop_sequence
    else:
        rs = RouteStop(
            route_id=route_id,
            stop_id=stop_id,
            direction_id=direction_id,
            stop_sequence=stop_sequence,
        )
        db.session.add(rs)


def create_user(firebase_uid, email, display_name, avatar_url):
    """Create a user with the provided information."""
    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    if not user:
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
        )
        db.session.add(user)
        db.session.commit()
    else:
        # Optionally update user info if changed
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
