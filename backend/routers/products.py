from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import datetime
from database import get_db
from models import Product, User, Invoice, InvoiceItem
from schemas import ProductCreate, ProductUpdate, ProductResponse
from auth import get_current_user

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("/", response_model=List[ProductResponse])
def list_products(skip: int = 0, limit: int = 200, category: str = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Product).filter(Product.user_id == user.id)
    if category:
        q = q.filter(Product.category == category)
    return q.offset(skip).limit(limit).all()


@router.get("/search", response_model=List[ProductResponse])
def search_products(q: str = Query(..., min_length=1), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    search = f"%{q}%"
    return db.query(Product).filter(
        Product.user_id == user.id,
        or_(
            Product.name.ilike(search),
            Product.barcode.ilike(search)
        )
    ).limit(10).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return p


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.barcode:
        existing = db.query(Product).filter(Product.user_id == user.id, Product.barcode == data.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu barkod zaten kayıtlı")

    product = Product(**data.model_dump(), user_id=user.id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(p, key, value)

    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    db.delete(p)
    db.commit()
    return {"message": "Ürün silindi"}


@router.get("/{product_id}/history")
def get_product_history(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    # Son 24 ayı oluştur
    today = datetime.now()
    months_list = []
    for i in range(23, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        months_list.append((y, m))

    # Satışları eşleştir
    sales_map = {(y, m): 0 for y, m in months_list}
    start_year, start_month = months_list[0]
    start_date = datetime(start_year, start_month, 1)

    items = db.query(InvoiceItem).join(Invoice, InvoiceItem.invoice_id == Invoice.id).filter(
        Invoice.user_id == user.id,
        InvoiceItem.product_id == product_id,
        Invoice.created_at >= start_date
    ).all()

    for item in items:
        dt = item.invoice.created_at
        if dt:
            key = (dt.year, dt.month)
            if key in sales_map:
                sales_map[key] += item.quantity

    # Türkçe ay isimleri
    tr_months = {
        1: "Oca", 2: "Şub", 3: "Mar", 4: "Nis", 5: "May", 6: "Haz",
        7: "Tem", 8: "Ağu", 9: "Eyl", 10: "Eki", 11: "Kas", 12: "Ara"
    }

    # Çıktı listesini oluştur
    history = []
    for y, m in months_list:
        label = f"{tr_months[m]} {str(y)[2:]}"
        history.append({
            "year": y,
            "month": m,
            "label": label,
            "sales": sales_map[(y, m)]
        })

    # Geriye dönük stok rekonstrüksiyonu
    current_stock = p.stock_quantity
    stock_map = {}
    temp_stock = current_stock

    for key in reversed(months_list):
        stock_map[key] = temp_stock
        sales_in_month = sales_map[key]
        temp_stock = max(0, temp_stock + sales_in_month)

    for h in history:
        key = (h["year"], h["month"])
        h["stock"] = stock_map[key]

    return {
        "product_id": product_id,
        "product_name": p.name,
        "current_stock": p.stock_quantity,
        "history": history
    }
