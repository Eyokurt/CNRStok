"""add qr_token to vehicle_receptions

Revision ID: 8b3f7f86d123
Revises: 942b8fbb4cd9
Create Date: 2026-05-31 21:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b3f7f86d123'
down_revision: Union[str, None] = '942b8fbb4cd9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add qr_token column to vehicle_receptions table
    op.add_column('vehicle_receptions', sa.Column('qr_token', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_vehicle_receptions_qr_token'), 'vehicle_receptions', ['qr_token'], unique=True)


def downgrade() -> None:
    # Drop unique index and qr_token column
    op.drop_index(op.f('ix_vehicle_receptions_qr_token'), table_name='vehicle_receptions')
    op.drop_column('vehicle_receptions', 'qr_token')
