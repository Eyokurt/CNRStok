from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from database import get_db
from models import Product, User
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
