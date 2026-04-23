import os
import httpx
import logging
from onebusaway import OnebusawaySDK

logger = logging.getLogger(__name__)

OBA_BASE_URL = "https://api.pugetsound.onebusaway.org/"

# Seattle-area agencies
AGENCIES = ["1", "40"]  # 1 = King County Metro, 40 = Sound Transit


def get_client():
    api_key = os.getenv("OBA_API_KEY", "TEST")
    return OnebusawaySDK(
        api_key=api_key,
        base_url=OBA_BASE_URL,
        timeout=httpx.Timeout(10.0, connect=5.0),
        max_retries=0,  # We handle retries ourselves in data_loader
    )


def fetch_routes_for_agency(agency_id):
    """Fetch all routes for a given agency."""
    oba = get_client()
    response = oba.routes_for_agency.list(agency_id)
    if not response or not response.data:
        logger.warning(f"No route data returned for agency {agency_id}")
        return []
    route_list = response.data.list if hasattr(response.data, 'list') else []
    routes = []
    for r in route_list:
        routes.append({
            'id': r.id,
            'agency_id': r.agency_id if hasattr(r, 'agency_id') else agency_id,
            'short_name': getattr(r, 'short_name', '') or '',
            'long_name': getattr(r, 'long_name', '') or '',
            'description': getattr(r, 'description', '') or '',
            'route_type': getattr(r, 'type', 3),
            'color': getattr(r, 'color', '') or '',
            'text_color': getattr(r, 'text_color', '') or '',
            'url': getattr(r, 'url', '') or '',
        })
    return routes


def fetch_stops_for_route(route_id):
    """Fetch stops grouped by direction with polylines for a route.

    Uses raw HTTP instead of the SDK because the SDK model incorrectly
    flattens the stopGroupings -> stopGroups nesting.

    Returns dict with:
      - directions: list of {direction_id, direction_name, encoded_polyline, stop_ids}
      - stops: dict of stop_id -> stop info
    """
    api_key = os.getenv("OBA_API_KEY", "TEST")
    url = f"{OBA_BASE_URL}api/where/stops-for-route/{route_id}.json"
    resp = httpx.get(url, params={"key": api_key}, timeout=10.0)
    resp.raise_for_status()
    data = resp.json().get("data", {})
    entry = data.get("entry", {})
    references = data.get("references", {})

    if not entry:
        logger.warning(f"No entry data for route {route_id}")
        return {'directions': [], 'stops': {}}

    # Parse stops from references
    stops = {}
    for s in references.get("stops", []):
        stops[s["id"]] = {
            'id': s["id"],
            'name': s.get("name", ""),
            'code': s.get("code", ""),
            'lat': s["lat"],
            'lon': s["lon"],
            'direction': s.get("direction", ""),
            'location_type': s.get("locationType", 0),
        }

    # Parse direction groupings
    # OBA API structure: stopGroupings[] -> stopGroups[] (nested!)
    directions = []
    for grouping in entry.get("stopGroupings", []):
        for group in grouping.get("stopGroups", []):
            dir_id = group.get("id", "0")
            name_obj = group.get("name", {})
            dir_name = name_obj.get("name", "") if isinstance(name_obj, dict) else ""

            # OBA exposes one polyline per *trip pattern variant* (e.g.
            # short-turns, deviations, "Summit" tail on Route 3). Keep the
            # full list so the frontend can fall back across variants when
            # a stop sits on a deviation that the main pattern misses.
            polylines = group.get("polylines", [])
            encoded_polylines = [
                p.get("points", "") for p in polylines if p.get("points")
            ]
            encoded = encoded_polylines[0] if encoded_polylines else ""

            stop_ids = group.get("stopIds", [])

            directions.append({
                'direction_id': dir_id,
                'direction_name': dir_name,
                'encoded_polyline': encoded,
                'encoded_polylines': encoded_polylines,
                'stop_ids': stop_ids,
            })

    # Fallback: if no per-direction polylines, use entry-level
    entry_polylines = entry.get("polylines", [])
    if entry_polylines:
        entry_encoded_list = [
            p.get("points", "") for p in entry_polylines if p.get("points")
        ]
        entry_encoded = entry_encoded_list[0] if entry_encoded_list else ""
        for d in directions:
            if not d['encoded_polyline'] and entry_encoded:
                d['encoded_polyline'] = entry_encoded
            if not d['encoded_polylines'] and entry_encoded_list:
                d['encoded_polylines'] = list(entry_encoded_list)

    return {'directions': directions, 'stops': stops}
