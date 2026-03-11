from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    business_name: str = ""


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    business_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Customer ───────────────────────────────────────────
class CustomerBase(BaseModel):
    business_name: str
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plate_number: str


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    business_name: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plate_number: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Product ────────────────────────────────────────────
class ProductBase(BaseModel):
    name: str
    barcode: Optional[str] = None
    unit_price: float = 0.0
    stock_quantity: int = 0
    category: Optional[str] = None
    critical_level: int = 10


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    category: Optional[str] = None
    critical_level: Optional[int] = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Invoice ────────────────────────────────────────────
class InvoiceItemCreate(BaseModel):
    product_id: int
    quantity: int


class InvoiceExtraCreate(BaseModel):
    description: str
    unit_price: float
    quantity: int = 1


class InvoiceItemResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    description: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    is_extra: bool = False

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    customer_id: int
    discount_rate: float = 0.0
    kdv_rate: float = 18.0
    items: List[InvoiceItemCreate] = []
    extras: List[InvoiceExtraCreate] = []


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    customer_name: Optional[str] = None
    subtotal: float
    discount_rate: float
    discount_amount: float
    kdv_rate: float
    kdv_amount: float
    total: float
    created_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


# ─── Dashboard ──────────────────────────────────────────
class DashboardStats(BaseModel):
    total_customers: int
    total_products: int
    total_invoices: int
    total_revenue: float
    critical_stock_products: List[ProductResponse]


# ─── Company Settings ───────────────────────────────────
class CompanySettingsSchema(BaseModel):
    company_name: str = ""
    company_address: str = ""
    company_tax_office: str = ""
    company_tax_number: str = ""
    company_phone: str = ""

    class Config:
        from_attributes = True


# ─── Vehicle Reception ──────────────────────────────────
class VehicleReceptionCreate(BaseModel):
    plate_number: str
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    km_reading: Optional[int] = None
    complaints: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class VehicleReceptionUpdate(BaseModel):
    plate_number: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    km_reading: Optional[int] = None
    complaints: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class VehiclePhotoResponse(BaseModel):
    id: int
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class VehicleReceptionResponse(BaseModel):
    id: int
    plate_number: str
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    km_reading: Optional[int] = None
    complaints: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    status: str
    received_at: datetime
    delivered_at: Optional[datetime] = None
    photos: List[VehiclePhotoResponse] = []

    class Config:
        from_attributes = True
