from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import CompanySettings, User
from schemas import CompanySettingsSchema
from auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/", response_model=CompanySettingsSchema)
def get_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    settings = db.query(CompanySettings).filter(CompanySettings.user_id == user.id).first()
    if not settings:
        settings = CompanySettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/", response_model=CompanySettingsSchema)
def update_settings(data: CompanySettingsSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    settings = db.query(CompanySettings).filter(CompanySettings.user_id == user.id).first()
    if not settings:
        settings = CompanySettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    for key, value in data.model_dump().items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings
