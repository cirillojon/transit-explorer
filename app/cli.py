"""Flask CLI commands for Transit Explorer.

Registered in app/__init__.py via app.cli.add_command(...).

Usage:
    flask data load           # refresh stale agencies (TTL gated)
    flask data load --force   # refresh everything regardless of TTL
    flask data load --agency 1 --agency 40
    flask data status         # print last-load state per agency
    flask data check-schema   # exit 1 if models drift from migration head
"""
import json
import sys
import logging
from datetime import datetime

import click
from flask import current_app
from flask.cli import AppGroup

from app import db
from app import data_loader

logger = logging.getLogger(__name__)


data_cli = AppGroup("data", help="Transit-data import + status commands.")


@data_cli.command("load")
@click.option("--agency", "agencies", multiple=True,
              help="Agency ID(s) to load. Repeat for multiple. Default: all.")
@click.option("--force/--no-force", default=False,
              help="Ignore the per-agency TTL and refresh every route.")
@click.option("--ttl-hours", type=float, default=None,
              help="Override OBA_REFRESH_TTL_HOURS for this run.")
def data_load(agencies, force, ttl_hours):
    """Refresh transit routes/stops/directions from OneBusAway."""
    results = data_loader.load_transit_data(
        agency_ids=list(agencies) or None,
        force=force,
        ttl_hours=ttl_hours,
    )
    click.echo(json.dumps(results, indent=2, default=str))


@data_cli.command("status")
def data_status():
    """Print the per-agency DataLoad state as JSON."""
    rows = data_loader.status()
    click.echo(json.dumps(rows, indent=2, default=str))


@data_cli.command("check-schema")
def data_check_schema():
    """Exit 1 if SQLAlchemy models drift from alembic head.

    Used by `bin/check-schema` and CI to fail builds where someone added
    a column to models.py without committing a migration.
    """
    from alembic.migration import MigrationContext
    from alembic.autogenerate import compare_metadata

    with db.engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        diff = compare_metadata(ctx, db.metadata)

    if not diff:
        click.echo("[check-schema] OK — models match migration head.")
        return

    click.echo("[check-schema] DRIFT DETECTED:", err=True)
    for entry in diff:
        click.echo(f"  - {entry}", err=True)
    click.echo(
        "\nGenerate a migration with:\n"
        "  flask db migrate -m \"<describe change>\"\n"
        "then commit it.",
        err=True,
    )
    sys.exit(1)


segments_cli = AppGroup(
    "segments", help="Maintenance commands for user-marked segments."
)


@segments_cli.command("clean-phantom-hops")
@click.option("--dry-run/--no-dry-run", default=True,
              help="When true (default), only report what would be deleted.")
def segments_clean_phantom_hops(dry_run):
    """Delete UserSegment rows whose endpoints aren't a consecutive hop in
    the deduped stop sequence the frontend renders.

    Earlier versions of mark_segments expanded a marked range over the raw
    OBA stop list, which on routes like Sound Transit 1 Line includes a
    same-name twin platform tacked onto the wrong direction's tail.
    Crossing such a duplicate produced rows that no user can ever toggle
    off and that inflate progress totals. New marks no longer create
    these, but existing rows need a one-time cleanup.
    """
    from app.models import RouteDirection, UserSegment
    from app.routes.api import (
        _deduped_stop_ids_per_direction,
        _valid_hops_per_direction,
    )

    route_ids = [
        rid for (rid,) in (
            RouteDirection.query
            .with_entities(RouteDirection.route_id)
            .distinct()
            .all()
        )
    ]
    valid_hops = _valid_hops_per_direction(
        _deduped_stop_ids_per_direction(route_ids)
    )

    # Stream rows + delete in batches so this command stays bounded in
    # memory and DB-transaction size as the table grows. Wired into
    # bin/start migrate, so it runs on every deploy.
    BATCH = 500
    SAMPLE_LIMIT = 20
    bad_count = 0
    sample = []
    deleted_ids = []

    def _flush_deletes():
        if not deleted_ids:
            return
        UserSegment.query.filter(UserSegment.id.in_(deleted_ids)).delete(
            synchronize_session=False
        )
        db.session.commit()
        deleted_ids.clear()

    for seg in UserSegment.query.yield_per(BATCH):
        hops = valid_hops.get((seg.route_id, seg.direction_id), set())
        if (seg.from_stop_id, seg.to_stop_id) in hops:
            continue
        bad_count += 1
        if len(sample) < SAMPLE_LIMIT:
            sample.append(
                f"  user={seg.user_id} route={seg.route_id} "
                f"dir={seg.direction_id} "
                f"{seg.from_stop_id} -> {seg.to_stop_id}"
            )
        if not dry_run:
            deleted_ids.append(seg.id)
            if len(deleted_ids) >= BATCH:
                _flush_deletes()

    click.echo(f"Found {bad_count} phantom UserSegment rows.")
    if not bad_count:
        return
    for line in sample:
        click.echo(line)
    if bad_count > SAMPLE_LIMIT:
        click.echo(f"  ... and {bad_count - SAMPLE_LIMIT} more")
    if dry_run:
        click.echo("Re-run with --no-dry-run to delete.")
        return
    _flush_deletes()
    click.echo(f"Deleted {bad_count} phantom UserSegment rows.")


def register_cli(app):
    app.cli.add_command(data_cli)
    app.cli.add_command(segments_cli)
