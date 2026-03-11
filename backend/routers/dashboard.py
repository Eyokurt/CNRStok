from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Customer, Product, Invoice, User
from schemas import DashboardStats, ProductResponse
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total_customers = db.query(Customer).filter(Customer.user_id == user.id).count()
    total_products = db.query(Product).filter(Product.user_id == user.id).count()
    total_invoices = db.query(Invoice).filter(Invoice.user_id == user.id).count()
    total_revenue = db.query(func.sum(Invoice.total)).filter(Invoice.user_id == user.id).scalar() or 0.0

    critical = db.query(Product).filter(
        Product.user_id == user.id,
        Product.stock_quantity <= Product.critical_level
    ).all()

    return DashboardStats(
        total_customers=total_customers,
        total_products=total_products,
        total_invoices=total_invoices,
        total_revenue=total_revenue,
        critical_stock_products=[ProductResponse.model_validate(p) for p in critical]
    )
