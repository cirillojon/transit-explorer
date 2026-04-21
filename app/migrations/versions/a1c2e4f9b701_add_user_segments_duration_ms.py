"""add user_segments.duration_ms

Revision ID: a1c2e4f9b701
Revises: f838d5f10e83
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1c2e4f9b701'
down_revision = 'f838d5f10e83'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user_segments') as batch_op:
        batch_op.add_column(sa.Column('duration_ms', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('user_segments') as batch_op:
        batch_op.drop_column('duration_ms')
