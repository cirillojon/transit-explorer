"""add data_loads table

Revision ID: b3d09f1e2c44
Revises: a1c2e4f9b701
Create Date: 2026-04-21 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b3d09f1e2c44'
down_revision = 'a1c2e4f9b701'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'data_loads' in insp.get_table_names():
        return
    op.create_table(
        'data_loads',
        sa.Column('agency_id', sa.String(length=50), nullable=False),
        sa.Column('last_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('last_success_at', sa.DateTime(), nullable=True),
        sa.Column('route_count', sa.Integer(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('agency_id'),
    )


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'data_loads' not in insp.get_table_names():
        return
    op.drop_table('data_loads')
