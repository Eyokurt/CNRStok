from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import re

def clean_and_validate_plate(v: str) -> str:
    cleaned = re.sub(r'[^A-Z0-9]', '', v.upper())
    if not (5 <= len(cleaned) <= 10):
        raise ValueError('Plaka numarasi 5 ila 10 karakter arasinda olmalidir')
    if not (any(c.isdigit() for c in cleaned) and any(c.isalpha() for c in cleaned)):
        raise ValueError('Plaka hem harf hem de rakam icermelidir')
    return cleaned

def clean_and_validate_phone(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    cleaned = re.sub(r'\D', '', v)
    if len(cleaned) == 10:
        return f"0{cleaned}"
    elif len(cleaned) == 11 and cleaned.startswith('0'):
        return cleaned
    else:
        raise ValueError('Telefon numarasi 10 veya 11 haneli olmalidir (Ornek: 05551234567)')

def clean_and_validate_tax_number(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    cleaned = re.sub(r'\D', '', v)
    if len(cleaned) not in (10, 11):
        raise ValueError('Vergi numarasi 10 haneli (VKN) veya 11 haneli (TCKN) olmalidir')
    return cleaned



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

    @field_validator('plate_number')
    @classmethod
    def validate_plate(cls, v: str) -> str:
        return clean_and_validate_plate(v)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_phone(v)

    @field_validator('tax_number')
    @classmethod
    def validate_tax_number(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_tax_number(v)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    business_name: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plate_number: Optional[str] = None

    @field_validator('plate_number')
    @classmethod
    def validate_plate(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return clean_and_validate_plate(v)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_phone(v)

    @field_validator('tax_number')
    @classmethod
    def validate_tax_number(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_tax_number(v)


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
    storage_location: Optional[str] = None

    @field_validator('unit_price')
    @classmethod
    def validate_unit_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError('Birim fiyat negatif olamaz')
        return v

    @field_validator('stock_quantity', 'critical_level')
    @classmethod
    def validate_non_negative_int(cls, v: int) -> int:
        if v < 0:
            raise ValueError('Stok miktari veya kritik seviye negatif olamaz')
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    category: Optional[str] = None
    critical_level: Optional[int] = None
    storage_location: Optional[str] = None

    @field_validator('unit_price')
    @classmethod
    def validate_unit_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError('Birim fiyat negatif olamaz')
        return v

    @field_validator('stock_quantity', 'critical_level')
    @classmethod
    def validate_non_negative_int(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError('Stok miktari veya kritik seviye negatif olamaz')
        return v


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

    @field_validator('plate_number')
    @classmethod
    def validate_plate(cls, v: str) -> str:
        return clean_and_validate_plate(v)

    @field_validator('owner_phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_phone(v)

    @field_validator('vehicle_year', 'km_reading')
    @classmethod
    def validate_non_negative_int(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError('Yil veya KM degeri negatif olamaz')
        return v


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

    @field_validator('plate_number')
    @classmethod
    def validate_plate(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return clean_and_validate_plate(v)

    @field_validator('owner_phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_phone(v)

    @field_validator('vehicle_year', 'km_reading')
    @classmethod
    def validate_non_negative_int(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError('Yil veya KM degeri negatif olamaz')
        return v


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
    qr_token: Optional[str] = None
    photos: List[VehiclePhotoResponse] = []

    class Config:
        from_attributes = True


# ─── Public/Shared Vehicle Reception Schemas (Privacy compliant) ───
class PublicVehiclePhotoResponse(BaseModel):
    id: int
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class PublicVehicleReceptionResponse(BaseModel):
    id: int
    plate_number: str
    owner_name: Optional[str] = None  # Will be masked on API level
    owner_phone: Optional[str] = None  # Will be masked on API level
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    km_reading: Optional[int] = None
    complaints: Optional[str] = None
    diagnosis: Optional[str] = None
    status: str
    received_at: datetime
    delivered_at: Optional[datetime] = None
    photos: List[PublicVehiclePhotoResponse] = []

    class Config:
        from_attributes = True


class PublicVehicleHistoryResponse(BaseModel):
    current_reception: PublicVehicleReceptionResponse
    history: List[PublicVehicleReceptionResponse] = []
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None


class PublicVehicleUploadDetailsResponse(BaseModel):
    plate_number: str
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None

    class Config:
        from_attributes = True

