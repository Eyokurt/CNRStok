from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from database import get_db
from models import Customer, User
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from auth import get_current_user

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("/", response_model=List[CustomerResponse])
def list_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Customer).filter(Customer.user_id == user.id).offset(skip).limit(limit).all()


@router.get("/search", response_model=List[CustomerResponse])
def search_customers(q: str = Query(..., min_length=1), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Autocomplete: plaka veya işyeri adına göre müşteri arama"""
    search = f"%{q}%"
    return db.query(Customer).filter(
        Customer.user_id == user.id,
        or_(
            Customer.plate_number.ilike(search),
            Customer.business_name.ilike(search)
        )
    ).limit(10).all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return c


@router.post("/", response_model=CustomerResponse, status_code=201)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(Customer).filter(Customer.user_id == user.id, Customer.plate_number == data.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu plaka zaten kayıtlı")

    customer = Customer(**data.model_dump(), user_id=user.id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(c, key, value)

    db.commit()
    db.refresh(c)
    return c


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id, Customer.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    db.delete(c)
    db.commit()
    return {"message": "Müşteri silindi"}
