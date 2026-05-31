"""Initial migration

Revision ID: 942b8fbb4cd9
Revises: 
Create Date: 2026-03-11 03:32:20.936131

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '942b8fbb4cd9'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('business_name', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create customers table
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('business_name', sa.String(length=255), nullable=False),
        sa.Column('tax_office', sa.String(length=255), nullable=True),
        sa.Column('tax_number', sa.String(length=50), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('plate_number', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customers_id'), 'customers', ['id'], unique=False)
    op.create_index(op.f('ix_customers_plate_number'), 'customers', ['plate_number'], unique=False)
    op.create_index('idx_user_plate', 'customers', ['user_id', 'plate_number'], unique=True)
    op.create_index('idx_business_name', 'customers', ['business_name'], unique=False)

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('barcode', sa.String(length=100), nullable=True),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('stock_quantity', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('critical_level', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)
    op.create_index(op.f('ix_products_barcode'), 'products', ['barcode'], unique=False)
    op.create_index('idx_user_barcode', 'products', ['user_id', 'barcode'], unique=True)
    op.create_index('idx_product_name', 'products', ['name'], unique=False)

    # Create company_settings table
    op.create_table(
        'company_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('company_address', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('company_tax_office', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('company_tax_number', sa.String(length=50), nullable=False, server_default=''),
        sa.Column('company_phone', sa.String(length=20), nullable=False, server_default=''),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_company_settings_id'), 'company_settings', ['id'], unique=False)
    op.create_index(op.f('ix_company_settings_user_id'), 'company_settings', ['user_id'], unique=True)

    # Create invoices table
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Float(), nullable=False),
        sa.Column('discount_rate', sa.Float(), nullable=False),
        sa.Column('discount_amount', sa.Float(), nullable=False),
        sa.Column('kdv_rate', sa.Float(), nullable=False),
        sa.Column('kdv_amount', sa.Float(), nullable=False),
        sa.Column('total', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
    op.create_index(op.f('ix_invoices_invoice_number'), 'invoices', ['invoice_number'], unique=True)

    # Create invoice_items table
    op.create_table(
        'invoice_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('total_price', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoice_items_id'), 'invoice_items', ['id'], unique=False)

    # Create vehicle_receptions table
    op.create_table(
        'vehicle_receptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plate_number', sa.String(length=20), nullable=False),
        sa.Column('owner_name', sa.String(length=255), nullable=True),
        sa.Column('owner_phone', sa.String(length=20), nullable=True),
        sa.Column('vehicle_brand', sa.String(length=100), nullable=True),
        sa.Column('vehicle_model', sa.String(length=100), nullable=True),
        sa.Column('vehicle_year', sa.Integer(), nullable=True),
        sa.Column('vehicle_color', sa.String(length=50), nullable=True),
        sa.Column('km_reading', sa.Integer(), nullable=True),
        sa.Column('complaints', sa.Text(), nullable=True),
        sa.Column('diagnosis', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='in_shop'),
        sa.Column('received_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_receptions_id'), 'vehicle_receptions', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_receptions_plate_number'), 'vehicle_receptions', ['plate_number'], unique=False)

    # Create vehicle_photos table
    op.create_table(
        'vehicle_photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reception_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['reception_id'], ['vehicle_receptions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_photos_id'), 'vehicle_photos', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_vehicle_photos_id'), table_name='vehicle_photos')
    op.drop_table('vehicle_photos')
    op.drop_index(op.f('ix_vehicle_receptions_plate_number'), table_name='vehicle_receptions')
    op.drop_index(op.f('ix_vehicle_receptions_id'), table_name='vehicle_receptions')
    op.drop_table('vehicle_receptions')
    op.drop_index(op.f('ix_invoice_items_id'), table_name='invoice_items')
    op.drop_table('invoice_items')
    op.drop_index(op.f('ix_invoices_invoice_number'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_id'), table_name='invoices')
    op.drop_table('invoices')
    op.drop_index(op.f('ix_company_settings_user_id'), table_name='company_settings')
    op.drop_index(op.f('ix_company_settings_id'), table_name='company_settings')
    op.drop_table('company_settings')
    op.drop_index('idx_user_barcode', table_name='products')
    op.drop_index('idx_product_name', table_name='products')
    op.drop_index(op.f('ix_products_name'), table_name='products')
    op.drop_index(op.f('ix_products_id'), table_name='products')
    op.drop_index(op.f('ix_products_barcode'), table_name='products')
    op.drop_table('products')
    op.drop_index('idx_user_plate', table_name='customers')
    op.drop_index('idx_business_name', table_name='customers')
    op.drop_index(op.f('ix_customers_plate_number'), table_name='customers')
    op.drop_index(op.f('ix_customers_id'), table_name='customers')
    op.drop_table('customers')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
