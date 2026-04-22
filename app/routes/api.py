import os
from flask import Blueprint, jsonify, request, g, make_response, current_app, abort
from sqlalchemy import func, distinct, desc
from app.models import Route, Stop, RouteDirection, RouteStop, User, UserSegment
from app import db, limiter
from app.auth import require_auth
from app.validators import (
    validate_id, validate_direction_id, validate_notes, validate_id_list,
    validate_duration_ms,
)
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)

api_blueprint = Blueprint('api', __name__)


# ─── Achievement definitions ─────────────────────────────────────────
# (id, label, description, kind, threshold, icon)
ACHIEVEMENTS = [
    ('first_ride',     'First Ride',         'Marked your first segment',          'segments',   1,    '🎟️'),
    ('ten_segments',   'Getting Around',     '10 segments completed',              'segments',   10,   '🚏'),
    ('fifty_segments', 'Daily Commuter',     '50 segments completed',              'segments',   50,   '🚌'),
    ('hundred_segs',   'Centurion',          '100 segments completed',             'segments',   100,  '💯'),
    ('five_hundred',   'Transit Veteran',    '500 segments completed',             'segments',   500,  '🏅'),
    ('thousand',       'Metro Master',       '1,000 segments completed',           'segments',   1000, '🏆'),
    ('first_route',    'Route Sampler',      'Rode at least one route',            'routes',     1,    '🧭'),
    ('five_routes',    'Explorer',           'Rode 5 different routes',            'routes',     5,    '🗺️'),
    ('twenty_routes',  'Network Navigator',  'Rode 20 different routes',           'routes',     20,   '🌐'),
    ('first_complete', 'Route Conqueror',    'Fully completed one route',          'completed',  1,    '👑'),
    ('five_complete',  'Line Collector',     'Fully completed 5 routes',           'completed',  5,    '🎖️'),
]


# ─── Public endpoints ────────────────────────────────────────────────

@api_blueprint.route('/health')
@limiter.exempt
def health():
    """Liveness probe + DB connectivity + per-agency data-load status."""
    try:
        db.session.execute(db.text('SELECT 1'))
        routes_loaded = db.session.query(func.count(Route.id)).scalar() or 0

        # Pull per-agency status from the persistent DataLoad table so
        # restarts don't lose state. Falls back gracefully if the table
        # hasn't been migrated in yet.
        agencies_payload = []
        last_success_at = None
        any_error = None
        try:
            from app.models import DataLoad
            for row in DataLoad.query.order_by(DataLoad.agency_id).all():
                agencies_payload.append(row.to_dict())
                if row.last_success_at and (
                    last_success_at is None or row.last_success_at > last_success_at
                ):
                    last_success_at = row.last_success_at
                if row.last_error and not any_error:
                    any_error = row.last_error
        except Exception:
            logger.exception("Health: DataLoad query failed (table missing?)")

        return jsonify({
            'status': 'ok',
            'routes_loaded': routes_loaded,
            'last_data_load_at': last_success_at.isoformat() if last_success_at else None,
            'last_data_load_error': any_error,
            'agencies': agencies_payload,
            'time': datetime.utcnow().isoformat(),
        })
    except Exception:
        logger.exception("Health check failed")
        return jsonify({'status': 'degraded'}), 503


@api_blueprint.route('/debug/directions')
def debug_directions():
    # Only available in non-production environments to avoid leaking schema
    # internals to unauthenticated callers.
    if os.getenv('FLASK_ENV', '').lower() == 'production':
        abort(404)
    total = RouteDirection.query.count()
    with_polylines = RouteDirection.query.filter(
        RouteDirection.encoded_polyline != None,  # noqa: E711
        RouteDirection.encoded_polyline != ''
    ).count()
    sample = RouteDirection.query.first()
    sample_data = sample.to_dict() if sample else None
    return jsonify({
        'total_directions': total,
        'with_polylines': with_polylines,
        'sample': sample_data,
    })


@api_blueprint.route('/routes')
def get_routes():
    """List routes with total possible segment counts (cached client-side)."""
    try:
        routes = Route.query.order_by(Route.short_name).all()
        seg_counts = _route_segment_counts()

        payload = []
        for r in routes:
            d = r.to_dict()
            d['total_segments'] = seg_counts.get(r.id, 0)
            payload.append(d)

        resp = make_response(jsonify({'routes': payload}))
        resp.headers['Cache-Control'] = 'public, max-age=300'
        return resp
    except Exception as e:
        logger.error(f"Error fetching routes: {e}")
        return jsonify({'error': 'Failed to fetch routes'}), 500


@api_blueprint.route('/routes/<string:route_id>')
def get_route(route_id):
    route = db.get_or_404(Route, route_id)
    result = route.to_dict_full()

    stop_ids = set()
    for direction in result['directions']:
        stop_ids.update(direction['stop_ids'])

    stops = Stop.query.filter(Stop.id.in_(stop_ids)).all() if stop_ids else []
    result['stops'] = {s.id: s.to_dict() for s in stops}
    result['total_segments'] = sum(
        max(0, len(d['stop_ids']) - 1) for d in result['directions']
    )

    resp = make_response(jsonify(result))
    resp.headers['Cache-Control'] = 'public, max-age=300'
    return resp


@api_blueprint.route('/stops')
def get_stops():
    stops = Stop.query.all()
    return jsonify({'stops': [s.to_dict() for s in stops]})


@api_blueprint.route('/leaderboard')
def get_leaderboard():
    """Top users by total segments. Supports period filter and pagination.

    Query params:
      - period: 'all' (default), 'week', 'month'
      - limit:  default 50, max 100
      - offset: default 0
    """
    period = request.args.get('period', 'all').lower()
    try:
        limit = min(max(int(request.args.get('limit', 50)), 1), 100)
        offset = max(int(request.args.get('offset', 0)), 0)
    except (TypeError, ValueError):
        return jsonify({'error': 'invalid limit/offset'}), 400

    q = (
        db.session.query(
            User.id,
            User.display_name,
            User.avatar_url,
            func.count(UserSegment.id).label('total_segments'),
            func.count(distinct(UserSegment.route_id)).label('total_routes'),
            func.max(UserSegment.completed_at).label('last_active'),
        )
        .join(UserSegment, User.id == UserSegment.user_id)
    )

    if period == 'week':
        q = q.filter(UserSegment.completed_at >= datetime.utcnow() - timedelta(days=7))
    elif period == 'month':
        q = q.filter(UserSegment.completed_at >= datetime.utcnow() - timedelta(days=30))

    q = q.group_by(User.id).order_by(desc('total_segments'))
    rows = q.offset(offset).limit(limit).all()

    leaderboard = []
    for i, row in enumerate(rows):
        leaderboard.append({
            'rank': offset + i + 1,
            'user_id': row.id,
            'display_name': row.display_name or 'Anonymous',
            'avatar_url': row.avatar_url,
            'total_segments': row.total_segments,
            'total_routes': row.total_routes,
            'last_active': row.last_active.isoformat() if row.last_active else None,
        })

    return jsonify({
        'leaderboard': leaderboard,
        'period': period,
        'limit': limit,
        'offset': offset,
    })


@api_blueprint.route('/users/<int:user_id>/profile')
def get_user_profile(user_id):
    """Public, read-only view of another explorer's progress.

    Returns the same shape used by the in-app Progress / Achievements panels
    so the frontend can reuse the same rendering. No auth required, but
    nothing mutable is exposed.
    """
    user = db.get_or_404(User, user_id)
    summary = _user_summary(user.id)
    achievements = _evaluate_achievements(summary)

    # Per-route progress (same logic as /me/progress, without the auth user)
    segments = UserSegment.query.filter_by(user_id=user.id).all()
    progress_list = []
    if segments:
        route_ids = list({s.route_id for s in segments})
        routes_by_id = {
            r.id: r for r in Route.query.filter(Route.id.in_(route_ids)).all()
        }
        dirs = RouteDirection.query.filter(
            RouteDirection.route_id.in_(route_ids)
        ).all()
        dir_name_map = {}
        totals_per_route = {rid: 0 for rid in route_ids}
        dirs_per_route = {rid: [] for rid in route_ids}
        for d in dirs:
            dir_name_map[(d.route_id, d.direction_id)] = (
                d.direction_name or d.direction_id
            )
            try:
                stop_ids = json.loads(d.stop_ids_json or '[]')
            except Exception:
                stop_ids = []
            count = max(0, len(stop_ids) - 1)
            totals_per_route[d.route_id] = (
                totals_per_route.get(d.route_id, 0) + count
            )
            dirs_per_route[d.route_id].append({
                'direction_id': d.direction_id,
                'direction_name': d.direction_name or d.direction_id,
                'stop_ids': stop_ids,
                'total_hops': count,
            })

        by_route = {}
        for seg in segments:
            rid = seg.route_id
            if rid not in by_route:
                r = routes_by_id.get(rid)
                by_route[rid] = {
                    'route_id': rid,
                    'route_name': (r.short_name or r.long_name or rid) if r else rid,
                    'route_color': r.color if r else None,
                    'route_type': r.route_type if r else None,
                    'total_segments': totals_per_route.get(rid, 0),
                    'completed_segments': 0,
                    'completion_pct': 0,
                    'directions': dirs_per_route.get(rid, []),
                    'segments': [],
                }
            by_route[rid]['completed_segments'] += 1
            seg_dict = seg.to_dict()
            seg_dict['direction_name'] = dir_name_map.get(
                (rid, seg.direction_id), seg.direction_id
            )
            by_route[rid]['segments'].append(seg_dict)

        for data in by_route.values():
            total = data['total_segments']
            completed = data['completed_segments']
            data['completion_pct'] = (
                round(completed / total * 100, 1) if total > 0 else 0
            )

        progress_list = sorted(
            by_route.values(),
            key=lambda x: (
                x['completion_pct'] >= 100,
                -x['completion_pct'],
                -x['completed_segments'],
            ),
        )

    return jsonify({
        'user': {
            'id': user.id,
            'display_name': user.display_name or 'Anonymous',
            'avatar_url': user.avatar_url,
            'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
        },
        **summary,
        'achievements': achievements,
        'progress': progress_list,
    })


# ─── Authenticated endpoints ─────────────────────────────────────────

@api_blueprint.route('/me')
@require_auth
def get_me():
    user = g.current_user
    summary = _user_summary(user.id)
    data = user.to_dict()
    data.update(summary)
    return jsonify(data)


@api_blueprint.route('/me/stats')
@require_auth
def get_stats():
    """Rich stats payload: totals, achievements, top routes, 14d sparkline, rank."""
    user = g.current_user
    summary = _user_summary(user.id)

    # Top 5 most-ridden routes
    top_routes_q = (
        db.session.query(
            UserSegment.route_id,
            func.count(UserSegment.id).label('segs'),
        )
        .filter(UserSegment.user_id == user.id)
        .group_by(UserSegment.route_id)
        .order_by(desc('segs'))
        .limit(5)
        .all()
    )
    if top_routes_q:
        route_meta = {
            r.id: r for r in Route.query.filter(
                Route.id.in_([t.route_id for t in top_routes_q])
            ).all()
        }
    else:
        route_meta = {}
    top_routes = []
    for t in top_routes_q:
        r = route_meta.get(t.route_id)
        top_routes.append({
            'route_id': t.route_id,
            'route_name': (r.short_name or r.long_name) if r else t.route_id,
            'route_color': r.color if r else None,
            'segments': t.segs,
        })

    # 14-day activity sparkline
    since = datetime.utcnow() - timedelta(days=14)
    by_day_rows = (
        db.session.query(
            func.date(UserSegment.completed_at).label('day'),
            func.count(UserSegment.id).label('count'),
        )
        .filter(UserSegment.user_id == user.id, UserSegment.completed_at >= since)
        .group_by('day')
        .all()
    )
    by_day = {str(r.day): r.count for r in by_day_rows}
    sparkline = []
    for i in range(13, -1, -1):
        d = (datetime.utcnow() - timedelta(days=i)).date().isoformat()
        sparkline.append({'date': d, 'count': by_day.get(d, 0)})

    achievements = _evaluate_achievements(summary)

    # Compute global rank by total_segments
    user_total = summary['total_segments']
    rank = None
    if user_total > 0:
        higher_count = (
            db.session.query(func.count(UserSegment.user_id))
            .filter(UserSegment.user_id != user.id)
            .group_by(UserSegment.user_id)
            .having(func.count(UserSegment.id) > user_total)
            .count()
        )
        rank = higher_count + 1

    return jsonify({
        **summary,
        'rank': rank,
        'top_routes': top_routes,
        'activity_14d': sparkline,
        'achievements': achievements,
    })


@api_blueprint.route('/me/activity')
@require_auth
def get_activity():
    """Recent rides, one entry per logged trip.

    A "trip" is the set of hops created by a single POST /me/segments,
    identified by sharing the same (route_id, direction_id, completed_at).
    Within a trip, hops are ordered along the route's stop sequence so the
    boarding and alighting stops are correct regardless of DB row order.
    """
    user = g.current_user
    try:
        limit = min(max(int(request.args.get('limit', 20)), 1), 100)
    except (TypeError, ValueError):
        limit = 20

    # Pull enough rows that `limit` distinct trips can be formed even when
    # individual trips contain many hops. 50 hops/trip is a generous cap.
    segs = (
        UserSegment.query
        .filter_by(user_id=user.id)
        .order_by(desc(UserSegment.completed_at), UserSegment.id)
        .limit(limit * 50)
        .all()
    )

    route_ids = list({s.route_id for s in segs})
    routes_by_id = (
        {r.id: r for r in Route.query.filter(Route.id.in_(route_ids)).all()}
        if route_ids else {}
    )

    # Build a stop-index lookup per (route_id, direction_id) so we can sort
    # hops within a trip along the route. Only fetch the directions we need.
    dir_rows = (
        RouteDirection.query.filter(RouteDirection.route_id.in_(route_ids)).all()
        if route_ids else []
    )
    stop_index = {}
    for d in dir_rows:
        try:
            stop_ids = json.loads(d.stop_ids_json or '[]')
        except (ValueError, TypeError):
            stop_ids = []
        if isinstance(stop_ids, list):
            stop_index[(d.route_id, d.direction_id)] = {
                sid: i for i, sid in enumerate(stop_ids)
            }

    # Bucket hops by trip key. dict preserves insertion order, which mirrors
    # the desc(completed_at) ordering above (newest trip first).
    trips = {}
    for s in segs:
        key = (s.route_id, s.direction_id, s.completed_at)
        trips.setdefault(key, []).append(s)
        if len(trips) > limit and key not in trips:
            # Defensive: shouldn't trigger because of setdefault above.
            break

    grouped = []
    for (route_id, direction_id, _), hops in trips.items():
        idx = stop_index.get((route_id, direction_id), {})
        hops_sorted = sorted(
            hops,
            key=lambda h: (idx.get(h.from_stop_id, 10**9), h.id),
        )
        first = hops_sorted[0]
        last = hops_sorted[-1]
        r = routes_by_id.get(route_id)
        grouped.append({
            'route_id': route_id,
            'route_name': (r.short_name or r.long_name) if r else route_id,
            'route_color': r.color if r else None,
            'direction_id': direction_id,
            'from_stop_id': first.from_stop_id,
            'from_stop_name': first.from_stop.name if first.from_stop else None,
            'to_stop_id': last.to_stop_id,
            'to_stop_name': last.to_stop.name if last.to_stop else None,
            'hops': len(hops_sorted),
            'completed_at': first.completed_at.isoformat() if first.completed_at else None,
        })
        if len(grouped) >= limit:
            break

    return jsonify({'activity': grouped})


@api_blueprint.route('/me/progress')
@require_auth
def get_progress():
    """Per-route completion summary. Constant-query: O(1) DB calls regardless of N."""
    user = g.current_user
    # Order matters: the frontend reconstructs trips by grouping hops with
    # the same (direction_id, completed_at) and then sorts within each trip
    # along the route. We sort here too so callers without that logic get
    # rows in route-ordered, time-grouped order.
    segments = (
        UserSegment.query
        .filter_by(user_id=user.id)
        .order_by(
            UserSegment.route_id,
            UserSegment.direction_id,
            UserSegment.completed_at,
            UserSegment.id,
        )
        .all()
    )
    if not segments:
        return jsonify({'progress': []})

    route_ids = list({s.route_id for s in segments})

    routes_by_id = {r.id: r for r in Route.query.filter(Route.id.in_(route_ids)).all()}

    dirs = RouteDirection.query.filter(RouteDirection.route_id.in_(route_ids)).all()
    dir_name_map = {}
    totals_per_route = {rid: 0 for rid in route_ids}
    dirs_per_route = {rid: [] for rid in route_ids}
    for d in dirs:
        dir_name_map[(d.route_id, d.direction_id)] = d.direction_name or d.direction_id
        try:
            stop_ids = json.loads(d.stop_ids_json or '[]')
        except Exception:
            stop_ids = []
        count = max(0, len(stop_ids) - 1)
        totals_per_route[d.route_id] = totals_per_route.get(d.route_id, 0) + count
        dirs_per_route[d.route_id].append({
            'direction_id': d.direction_id,
            'direction_name': d.direction_name or d.direction_id,
            'stop_ids': stop_ids,
            'total_hops': count,
        })

    by_route = {}
    for seg in segments:
        rid = seg.route_id
        if rid not in by_route:
            r = routes_by_id.get(rid)
            by_route[rid] = {
                'route_id': rid,
                'route_name': (r.short_name or r.long_name or rid) if r else rid,
                'route_color': r.color if r else None,
                'route_type': r.route_type if r else None,
                'total_segments': totals_per_route.get(rid, 0),
                'completed_segments': 0,
                'completion_pct': 0,
                'directions': dirs_per_route.get(rid, []),
                'segments': [],
            }
        by_route[rid]['completed_segments'] += 1
        seg_dict = seg.to_dict()
        seg_dict['direction_name'] = dir_name_map.get((rid, seg.direction_id), seg.direction_id)
        by_route[rid]['segments'].append(seg_dict)

    for data in by_route.values():
        total = data['total_segments']
        completed = data['completed_segments']
        data['completion_pct'] = round(completed / total * 100, 1) if total > 0 else 0

    # Sort: in-progress first (highest %), completed routes last
    progress_list = sorted(
        by_route.values(),
        key=lambda x: (x['completion_pct'] >= 100, -x['completion_pct'], -x['completed_segments']),
    )
    return jsonify({'progress': progress_list})


@api_blueprint.route('/me/segments', methods=['POST'])
@require_auth
@limiter.limit("30 per minute; 500 per hour")
def mark_segments():
    """Mark a contiguous run of segments as completed.

    Returns: { created, skipped, segments[], new_achievements[], totals }
    """
    user = g.current_user
    data = request.get_json(silent=True) or {}

    try:
        route_id = validate_id(data.get('route_id'), 'route_id')
        direction_id = validate_direction_id(data.get('direction_id'))
        from_stop_id = validate_id(data.get('from_stop_id'), 'from_stop_id')
        to_stop_id = validate_id(data.get('to_stop_id'), 'to_stop_id')
        notes = validate_notes(data.get('notes'))
        duration_ms = validate_duration_ms(data.get('duration_ms'))
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400

    if from_stop_id == to_stop_id:
        return jsonify({'error': 'from and to stops must differ'}), 400

    direction = RouteDirection.query.filter_by(
        route_id=route_id, direction_id=direction_id
    ).first()
    if not direction:
        return jsonify({'error': 'Invalid route/direction'}), 404

    try:
        stop_ids = json.loads(direction.stop_ids_json) if direction.stop_ids_json else []
        if not isinstance(stop_ids, list):
            raise ValueError('stop_ids_json is not a list')
    except (ValueError, TypeError):
        logger.warning(
            "Corrupt stop_ids_json for route=%s direction=%s",
            route_id, direction_id,
        )
        return jsonify({'error': 'Route data unavailable, please retry'}), 503
    try:
        from_idx = stop_ids.index(from_stop_id)
        to_idx = stop_ids.index(to_stop_id)
    except ValueError:
        return jsonify({'error': 'from_stop_id or to_stop_id not on this route/direction'}), 400
    if from_idx >= to_idx:
        return jsonify({'error': 'from_stop must come before to_stop in the route sequence'}), 400

    before = _user_summary(user.id)

    pair_keys = [(stop_ids[i], stop_ids[i + 1]) for i in range(from_idx, to_idx)]
    existing = set()
    if pair_keys:
        existing_rows = UserSegment.query.filter(
            UserSegment.user_id == user.id,
            UserSegment.route_id == route_id,
            UserSegment.direction_id == direction_id,
            UserSegment.from_stop_id.in_([p[0] for p in pair_keys]),
            UserSegment.to_stop_id.in_([p[1] for p in pair_keys]),
        ).all()
        existing = {(e.from_stop_id, e.to_stop_id) for e in existing_rows}

    created = []
    now = datetime.utcnow()
    # Attach the measured trip duration + notes to the first row we actually
    # create (not the first pair_key), so duration isn't silently dropped
    # when pair_keys[0] was already marked on an earlier ride.
    first_new = True
    for (a, b) in pair_keys:
        if (a, b) in existing:
            continue
        segment = UserSegment(
            user_id=user.id,
            route_id=route_id,
            direction_id=direction_id,
            from_stop_id=a,
            to_stop_id=b,
            completed_at=now,
            notes=notes if first_new else '',
            duration_ms=duration_ms if first_new else None,
        )
        db.session.add(segment)
        created.append(segment)
        first_new = False

    db.session.commit()

    after = _user_summary(user.id)
    new_achievements = _diff_achievements(before, after)

    return jsonify({
        'created': len(created),
        'skipped': len(pair_keys) - len(created),
        'segments': [s.to_dict() for s in created],
        'new_achievements': new_achievements,
        'totals': after,
    }), 201


@api_blueprint.route('/me/segments/<int:segment_id>/notes', methods=['PUT'])
@require_auth
def update_segment_notes(segment_id):
    user = g.current_user
    segment = UserSegment.query.filter_by(id=segment_id, user_id=user.id).first()
    if not segment:
        return jsonify({'error': 'Segment not found'}), 404
    data = request.get_json(silent=True) or {}
    try:
        segment.notes = validate_notes(data.get('notes'))
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    db.session.commit()
    return jsonify(segment.to_dict())


@api_blueprint.route('/me/segments/<int:segment_id>/duration', methods=['PUT'])
@require_auth
def update_segment_duration(segment_id):
    """Edit (or clear) the measured trip duration on a single segment row.

    Pass `duration_ms`: a non-negative integer of milliseconds, or `null`
    to clear it.
    """
    user = g.current_user
    segment = UserSegment.query.filter_by(id=segment_id, user_id=user.id).first()
    if not segment:
        return jsonify({'error': 'Segment not found'}), 404
    data = request.get_json(silent=True) or {}
    if 'duration_ms' not in data:
        return jsonify({'error': 'duration_ms is required (use null to clear)'}), 400
    try:
        segment.duration_ms = validate_duration_ms(data.get('duration_ms'))
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    db.session.commit()
    return jsonify(segment.to_dict())


@api_blueprint.route('/me/segments/<int:segment_id>', methods=['DELETE'])
@require_auth
def delete_segment(segment_id):
    user = g.current_user
    segment = UserSegment.query.filter_by(id=segment_id, user_id=user.id).first()
    if not segment:
        return jsonify({'error': 'Segment not found'}), 404
    db.session.delete(segment)
    db.session.commit()
    return jsonify({'deleted': True})


@api_blueprint.route('/me/segments/bulk', methods=['DELETE'])
@require_auth
@limiter.limit("10 per minute")
def bulk_delete_segments():
    """Bulk-delete by id list, or wipe a whole route (with confirm flag)."""
    user = g.current_user
    data = request.get_json(silent=True) or {}
    ids = data.get('ids')
    raw_route_id = data.get('route_id')

    q = UserSegment.query.filter_by(user_id=user.id)
    if ids is not None:
        try:
            ids = validate_id_list(ids, 'ids')
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400
        if not ids:
            return jsonify({'deleted': 0})
        q = q.filter(UserSegment.id.in_(ids))
    elif raw_route_id and data.get('confirm') is True:
        try:
            route_id = validate_id(raw_route_id, 'route_id')
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400
        q = q.filter_by(route_id=route_id)
    else:
        return jsonify({'error': 'Provide ids[] or route_id with confirm=true'}), 400

    deleted = q.delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'deleted': deleted})


# ─── Helpers ──────────────────────────────────────────────────────────

def _route_segment_counts():
    """{route_id: total_possible_segments} computed in a single query."""
    out = {}
    for d in RouteDirection.query.with_entities(
        RouteDirection.route_id, RouteDirection.stop_ids_json
    ).all():
        try:
            n = max(0, len(json.loads(d.stop_ids_json or '[]')) - 1)
        except Exception:
            n = 0
        out[d.route_id] = out.get(d.route_id, 0) + n
    return out


def _user_summary(user_id):
    """Aggregate stats for a user — used by /me, /me/stats, achievement diffing."""
    total_segments = (
        db.session.query(func.count(UserSegment.id))
        .filter(UserSegment.user_id == user_id)
        .scalar() or 0
    )
    total_routes = (
        db.session.query(func.count(distinct(UserSegment.route_id)))
        .filter(UserSegment.user_id == user_id)
        .scalar() or 0
    )

    completed_routes = 0
    if total_routes:
        per_route_done = dict(
            db.session.query(
                UserSegment.route_id, func.count(UserSegment.id)
            )
            .filter(UserSegment.user_id == user_id)
            .group_by(UserSegment.route_id)
            .all()
        )
        totals = _route_segment_counts()
        for rid, done in per_route_done.items():
            if totals.get(rid, 0) > 0 and done >= totals[rid]:
                completed_routes += 1

    return {
        'total_segments': total_segments,
        'total_routes': total_routes,
        'completed_routes': completed_routes,
    }


def _evaluate_achievements(summary):
    out = []
    for aid, label, desc_, kind, thresh, icon in ACHIEVEMENTS:
        value = summary.get({
            'segments': 'total_segments',
            'routes': 'total_routes',
            'completed': 'completed_routes',
        }.get(kind, ''), 0)
        out.append({
            'id': aid,
            'label': label,
            'description': desc_,
            'icon': icon,
            'unlocked': value >= thresh,
            'progress': min(value, thresh),
            'threshold': thresh,
        })
    return out


def _diff_achievements(before, after):
    """Achievements that flipped locked→unlocked between two summary snapshots."""
    bset = {a['id'] for a in _evaluate_achievements(before) if a['unlocked']}
    return [a for a in _evaluate_achievements(after) if a['unlocked'] and a['id'] not in bset]
