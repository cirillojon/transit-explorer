"""add route_directions.encoded_polylines_json

Revision ID: c7e4a2d18b55
Revises: b3d09f1e2c44
Create Date: 2026-04-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c7e4a2d18b55'
down_revision = 'b3d09f1e2c44'
branch_labels = None
depends_on = None


def upgrade():
    # Idempotent + lock-friendly: a plain ADD COLUMN works natively on
    # SQLite (no batch table copy) and on Postgres.
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('route_directions')}
    if 'encoded_polylines_json' in cols:
        return
    op.add_column(
        'route_directions',
        sa.Column('encoded_polylines_json', sa.Text(), nullable=True),
    )


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('route_directions')}
    if 'encoded_polylines_json' not in cols:
        return
    with op.batch_alter_table('route_directions') as batch_op:
        batch_op.drop_column('encoded_polylines_json')
