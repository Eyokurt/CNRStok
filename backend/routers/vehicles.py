from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
from models import VehicleReception, VehiclePhoto, User
from schemas import VehicleReceptionCreate, VehicleReceptionUpdate, VehicleReceptionResponse
from auth import get_current_user
import os
import uuid

router = APIRouter(prefix="/api/vehicles", tags=["Vehicle Reception"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "vehicles")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=List[VehicleReceptionResponse])
def list_receptions(status: Optional[str] = None, search: Optional[str] = None,
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(VehicleReception).filter(VehicleReception.user_id == user.id)
    if status:
        q = q.filter(VehicleReception.status == status)
    if search:
        search_upper = search.upper()
        q = q.filter(
            (VehicleReception.plate_number.ilike(f"%{search_upper}%")) |
            (VehicleReception.owner_name.ilike(f"%{search}%")) |
            (VehicleReception.vehicle_brand.ilike(f"%{search}%"))
        )
    return q.order_by(VehicleReception.received_at.desc()).all()


@router.get("/{reception_id}", response_model=VehicleReceptionResponse)
def get_reception(reception_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")
    return rec


@router.post("/", response_model=VehicleReceptionResponse, status_code=201)
def create_reception(data: VehicleReceptionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = VehicleReception(
        user_id=user.id,
        plate_number=data.plate_number.upper().strip(),
        owner_name=data.owner_name,
        owner_phone=data.owner_phone,
        vehicle_brand=data.vehicle_brand,
        vehicle_model=data.vehicle_model,
        vehicle_year=data.vehicle_year,
        vehicle_color=data.vehicle_color,
        km_reading=data.km_reading,
        complaints=data.complaints,
        diagnosis=data.diagnosis,
        notes=data.notes,
        status="in_shop"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.put("/{reception_id}", response_model=VehicleReceptionResponse)
def update_reception(reception_id: int, data: VehicleReceptionUpdate,
                     db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")

    update_data = data.model_dump(exclude_unset=True)

    # Durum "delivered" olursa teslim tarihini ayarla
    if update_data.get("status") == "delivered" and rec.status != "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc)
    elif update_data.get("status") == "in_shop" and rec.status == "delivered":
        update_data["delivered_at"] = None

    for key, value in update_data.items():
        if key == "plate_number" and value:
            value = value.upper().strip()
        setattr(rec, key, value)

    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{reception_id}", status_code=204)
def delete_reception(reception_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")
    # Fotoğrafları dosya sisteminden de sil
    for photo in rec.photos:
        full_path = os.path.join(UPLOAD_DIR, os.path.basename(photo.file_path))
        if os.path.exists(full_path):
            os.remove(full_path)
    db.delete(rec)
    db.commit()


@router.post("/{reception_id}/photos", response_model=VehicleReceptionResponse)
async def upload_photos(reception_id: int, files: List[UploadFile] = File(...),
                        db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")

    for file in files:
        ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        photo = VehiclePhoto(
            reception_id=rec.id,
            file_path=f"/uploads/vehicles/{filename}"
        )
        db.add(photo)

    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{reception_id}/photos/{photo_id}", status_code=204)
def delete_photo(reception_id: int, photo_id: int,
                 db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")
    photo = db.query(VehiclePhoto).filter(
        VehiclePhoto.id == photo_id, VehiclePhoto.reception_id == rec.id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Fotograf bulunamadi")
    # Dosyayı sil
    full_path = os.path.join(UPLOAD_DIR, os.path.basename(photo.file_path))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(photo)
    db.commit()
