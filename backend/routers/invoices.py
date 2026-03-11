from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from database import get_db
from models import Invoice, InvoiceItem, Product, Customer, CompanySettings, User
from schemas import InvoiceCreate, InvoiceResponse, InvoiceItemResponse
from pdf_generator import generate_invoice_pdf
from auth import get_current_user
import io

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


def generate_invoice_number():
    now = datetime.now(timezone.utc)
    return f"FTR-{now.strftime('%Y%m%d-%H%M%S')}"


def build_item_response(item, db):
    """InvoiceItem → InvoiceItemResponse"""
    is_extra = item.product_id is None
    product_name = None
    if not is_extra and item.product_id:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        product_name = product.name if product else None
    return InvoiceItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=product_name,
        description=item.description,
        quantity=item.quantity,
        unit_price=item.unit_price,
        total_price=item.total_price,
        is_extra=is_extra
    )


def build_invoice_response(inv, db):
    """Invoice → InvoiceResponse"""
    return InvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        customer_id=inv.customer_id,
        customer_name=inv.customer.business_name if inv.customer else None,
        subtotal=inv.subtotal,
        discount_rate=inv.discount_rate,
        discount_amount=inv.discount_amount,
        kdv_rate=inv.kdv_rate,
        kdv_amount=inv.kdv_amount,
        total=inv.total,
        created_at=inv.created_at,
        items=[build_item_response(item, db) for item in inv.items]
    )


@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    invoices = db.query(Invoice).filter(Invoice.user_id == user.id).order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return [build_invoice_response(inv, db) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    return build_invoice_response(inv, db)


@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == data.customer_id, Customer.user_id == user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    if not data.items and not data.extras:
        raise HTTPException(status_code=400, detail="Faturada en az bir kalem olmalı")

    invoice_items = []
    subtotal = 0.0

    # ─── Stok ürünleri ────────────────────────────────────
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id, Product.user_id == user.id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: ID {item_data.product_id}")
        if product.stock_quantity < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Yetersiz stok: '{product.name}' — Mevcut: {product.stock_quantity}, İstenen: {item_data.quantity}"
            )

        line_total = product.unit_price * item_data.quantity
        subtotal += line_total
        invoice_items.append(InvoiceItem(
            product_id=product.id, quantity=item_data.quantity,
            unit_price=product.unit_price, total_price=line_total
        ))
        product.stock_quantity -= item_data.quantity

    # ─── Ekstra kalemler (işçilik, servis, vb.) ──────────
    for extra in data.extras:
        line_total = extra.unit_price * extra.quantity
        subtotal += line_total
        invoice_items.append(InvoiceItem(
            product_id=None,
            description=extra.description,
            quantity=extra.quantity,
            unit_price=extra.unit_price,
            total_price=line_total
        ))

    discount_amount = subtotal * (data.discount_rate / 100)
    after_discount = subtotal - discount_amount
    kdv_amount = after_discount * (data.kdv_rate / 100)
    total = after_discount + kdv_amount

    invoice = Invoice(
        user_id=user.id,
        invoice_number=generate_invoice_number(),
        customer_id=data.customer_id,
        subtotal=round(subtotal, 2),
        discount_rate=data.discount_rate,
        discount_amount=round(discount_amount, 2),
        kdv_rate=data.kdv_rate,
        kdv_amount=round(kdv_amount, 2),
        total=round(total, 2),
        items=invoice_items
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return build_invoice_response(invoice, db)


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")

    customer = inv.customer
    items_data = []
    for item in inv.items:
        if item.product_id:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            name = product.name if product else "Bilinmeyen"
        else:
            name = item.description or "Ekstra"
        items_data.append({
            "product_name": name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price
        })

    settings = db.query(CompanySettings).filter(CompanySettings.user_id == user.id).first()

    pdf_buffer = generate_invoice_pdf(
        invoice_number=inv.invoice_number,
        customer_name=customer.business_name,
        customer_address=customer.address or "",
        customer_tax_office=customer.tax_office or "",
        customer_tax_number=customer.tax_number or "",
        customer_phone=customer.phone or "",
        customer_plate=customer.plate_number,
        items=items_data,
        subtotal=inv.subtotal,
        discount_rate=inv.discount_rate,
        discount_amount=inv.discount_amount,
        kdv_rate=inv.kdv_rate,
        kdv_amount=inv.kdv_amount,
        total=inv.total,
        created_at=inv.created_at,
        company_name=settings.company_name if settings else "",
        company_address=settings.company_address if settings else "",
        company_tax_office=settings.company_tax_office if settings else "",
        company_tax_number=settings.company_tax_number if settings else "",
        company_phone=settings.company_phone if settings else "",
    )

    return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={inv.invoice_number}.pdf"}
    )
