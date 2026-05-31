"""add storage_location to products

Revision ID: a8b2c6d4e2f1
Revises: 8b3f7f86d123
Create Date: 2026-05-31 21:36:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8b2c6d4e2f1'
down_revision: Union[str, None] = '8b3f7f86d123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add storage_location column to products table
    op.add_column('products', sa.Column('storage_location', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_products_storage_location'), 'products', ['storage_location'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_products_storage_location'), table_name='products')
    op.drop_column('products', 'storage_location')
