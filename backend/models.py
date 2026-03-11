from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=False, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    customers = relationship("Customer", back_populates="user")
    products = relationship("Product", back_populates="user")
    invoices = relationship("Invoice", back_populates="user")
    vehicle_receptions = relationship("VehicleReception", back_populates="user")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    business_name = Column(String(255), nullable=False, index=True)
    tax_office = Column(String(255), nullable=True)
    tax_number = Column(String(50), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    plate_number = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer")

    __table_args__ = (
        Index("idx_user_plate", "user_id", "plate_number", unique=True),
        Index("idx_business_name", "business_name"),
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    barcode = Column(String(100), nullable=True, index=True)
    unit_price = Column(Float, nullable=False, default=0.0)
    stock_quantity = Column(Integer, nullable=False, default=0)
    category = Column(String(100), nullable=True)
    critical_level = Column(Integer, nullable=False, default=10)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="products")
    invoice_items = relationship("InvoiceItem", back_populates="product")

    __table_args__ = (
        Index("idx_user_barcode", "user_id", "barcode", unique=True),
        Index("idx_product_name", "name"),
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    subtotal = Column(Float, nullable=False, default=0.0)
    discount_rate = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    kdv_rate = Column(Float, nullable=False, default=18.0)
    kdv_amount = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # None = ekstra kalem
    description = Column(String(255), nullable=True)  # İşçilik, servis, vb.
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", back_populates="invoice_items")


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    company_name = Column(String(255), nullable=False, default="")
    company_address = Column(String(500), nullable=False, default="")
    company_tax_office = Column(String(255), nullable=False, default="")
    company_tax_number = Column(String(50), nullable=False, default="")
    company_phone = Column(String(20), nullable=False, default="")


class VehicleReception(Base):
    __tablename__ = "vehicle_receptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plate_number = Column(String(20), nullable=False, index=True)
    owner_name = Column(String(255), nullable=True)
    owner_phone = Column(String(20), nullable=True)
    vehicle_brand = Column(String(100), nullable=True)
    vehicle_model = Column(String(100), nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    vehicle_color = Column(String(50), nullable=True)
    km_reading = Column(Integer, nullable=True)
    complaints = Column(Text, nullable=True)       # Müşteri şikayetleri
    diagnosis = Column(Text, nullable=True)         # Teknisyen tespiti
    notes = Column(Text, nullable=True)             # Ek notlar
    status = Column(String(20), nullable=False, default="in_shop")  # in_shop / delivered
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="vehicle_receptions")
    photos = relationship("VehiclePhoto", back_populates="reception", cascade="all, delete-orphan")


class VehiclePhoto(Base):
    __tablename__ = "vehicle_photos"

    id = Column(Integer, primary_key=True, index=True)
    reception_id = Column(Integer, ForeignKey("vehicle_receptions.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    reception = relationship("VehicleReception", back_populates="photos")
