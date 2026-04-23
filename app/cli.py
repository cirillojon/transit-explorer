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

    bad = []
    for seg in UserSegment.query.all():
        hops = valid_hops.get((seg.route_id, seg.direction_id), set())
        if (seg.from_stop_id, seg.to_stop_id) not in hops:
            bad.append(seg)

    click.echo(f"Found {len(bad)} phantom UserSegment rows.")
    if not bad:
        return
    if dry_run:
        for s in bad[:20]:
            click.echo(
                f"  user={s.user_id} route={s.route_id} dir={s.direction_id} "
                f"{s.from_stop_id} -> {s.to_stop_id}"
            )
        if len(bad) > 20:
            click.echo(f"  ... and {len(bad) - 20} more")
        click.echo("Re-run with --no-dry-run to delete.")
        return

    for s in bad:
        db.session.delete(s)
    db.session.commit()
    click.echo(f"Deleted {len(bad)} phantom UserSegment rows.")


def register_cli(app):
    app.cli.add_command(data_cli)
    app.cli.add_command(segments_cli)
