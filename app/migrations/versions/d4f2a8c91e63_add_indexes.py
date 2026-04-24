"""add indexes on FK columns and hot-path compound index

Revision ID: d4f2a8c91e63
Revises: c7e4a2d18b55
Create Date: 2026-04-24 12:00:00.000000

Adds explicit indexes that were missing on foreign-key columns and on the
``UserSegment`` (user_id, route_id, direction_id) compound used by
``/me/progress`` and ``POST /me/segments``. SQLite-safe via batch_alter.

ORM cascades (``cascade='all, delete-orphan'``) are declared in models.py
and operate at the SQLAlchemy session level. We intentionally do not add
DB-level ``ON DELETE CASCADE`` here: SQLite would require recreating
every child table to apply it, and no production code path performs raw
SQL DELETEs that bypass the session.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'd4f2a8c91e63'
down_revision = 'c7e4a2d18b55'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('routes', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_routes_agency_id'), ['agency_id'], unique=False,
        )

    with op.batch_alter_table('route_directions', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_route_directions_route_id'),
            ['route_id'], unique=False,
        )

    with op.batch_alter_table('route_stops', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_route_stops_route_id'),
            ['route_id'], unique=False,
        )
        batch_op.create_index(
            batch_op.f('ix_route_stops_stop_id'),
            ['stop_id'], unique=False,
        )

    with op.batch_alter_table('user_segments', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_user_segments_user_id'),
            ['user_id'], unique=False,
        )
        batch_op.create_index(
            batch_op.f('ix_user_segments_route_id'),
            ['route_id'], unique=False,
        )
        batch_op.create_index(
            'ix_user_segments_user_route_dir',
            ['user_id', 'route_id', 'direction_id'],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('user_segments', schema=None) as batch_op:
        batch_op.drop_index('ix_user_segments_user_route_dir')
        batch_op.drop_index(batch_op.f('ix_user_segments_route_id'))
        batch_op.drop_index(batch_op.f('ix_user_segments_user_id'))

    with op.batch_alter_table('route_stops', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_route_stops_stop_id'))
        batch_op.drop_index(batch_op.f('ix_route_stops_route_id'))

    with op.batch_alter_table('route_directions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_route_directions_route_id'))

    with op.batch_alter_table('routes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_routes_agency_id'))
