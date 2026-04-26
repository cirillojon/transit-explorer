"""add users.is_private

Revision ID: e5f3b7d92a18
Revises: d4f2a8c91e63
Create Date: 2026-04-26 13:00:00.000000

Adds an opt-in privacy flag so users can hide their specific route details
from public profile views. When set, the GET /api/users/<id>/profile endpoint
returns only aggregate totals (total_segments, total_routes, completed_routes)
and omits the per-route `progress` list.
"""
from alembic import op
import sqlalchemy as sa


revision = 'e5f3b7d92a18'
down_revision = 'd4f2a8c91e63'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('users')}
    if 'is_private' in cols:
        return
    op.add_column(
        'users',
        sa.Column(
            'is_private',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('0'),
        ),
    )


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('users')}
    if 'is_private' not in cols:
        return
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_private')
