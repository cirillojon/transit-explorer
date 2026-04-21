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


def register_cli(app):
    app.cli.add_command(data_cli)
