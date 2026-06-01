from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import get_db
from models import VehicleReception, VehiclePhoto, User, CompanySettings
from schemas import (
    VehicleReceptionCreate,
    VehicleReceptionUpdate,
    VehicleReceptionResponse,
    PublicVehicleHistoryResponse,
    PublicVehicleReceptionResponse,
    PublicVehiclePhotoResponse,
    PublicVehicleUploadDetailsResponse
)
from auth import get_current_user
from pdf_generator import generate_vehicle_pdf
from config import limiter, settings
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError
import os
import uuid
import io

router = APIRouter(prefix="/api/vehicles", tags=["Vehicle Reception"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "vehicles")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/public-upload/details", response_model=PublicVehicleUploadDetailsResponse)
@limiter.limit("30/minute")
def get_public_upload_details(request: Request, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "qr_upload":
            raise HTTPException(status_code=400, detail="Geçersiz işlem tipi")
        
        reception_id = payload.get("reception_id")
        user_id_str = payload.get("sub")
        if not reception_id or not user_id_str:
            raise HTTPException(status_code=400, detail="Geçersiz token içeriği")
            
        user_id = int(user_id_str)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Yükleme bağlantısının süresi dolmuş (10 dk limit). Lütfen bilgisayar ekranındaki QR kodu yenileyin.")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Geçersiz veya bozuk yükleme bağlantısı")
        
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Araç kaydı bulunamadı")
        
    return rec


@router.post("/public-upload/photos")
@limiter.limit("20/minute")
async def public_upload_photos(
    request: Request,
    token: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "qr_upload":
            raise HTTPException(status_code=400, detail="Geçersiz işlem tipi")
        
        reception_id = payload.get("reception_id")
        user_id_str = payload.get("sub")
        if not reception_id or not user_id_str:
            raise HTTPException(status_code=400, detail="Geçersiz token içeriği")
            
        user_id = int(user_id_str)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Yükleme bağlantısının süresi dolmuş. Lütfen bilgisayardan yeni bir QR kod alın.")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Geçersiz veya bozuk yükleme bağlantısı")
        
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Araç kaydı bulunamadı")

    # Strict file validations
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per file

    for file in files:
        ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Desteklenmeyen dosya formatı ({ext}). Sadece JPG, PNG, WEBP ve HEIC desteklenir."
            )
            
        # Read content to check size and write to disk
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Dosya boyutu çok büyük. Maksimum 10MB boyutunda görsel yükleyebilirsiniz."
            )
            
        # Re-verify mime type for added security
        content_type = file.content_type or ""
        if not content_type.startswith("image/") and ext != ".heic":
            raise HTTPException(
                status_code=400,
                detail="Yüklenen dosya geçerli bir görsel değil."
            )
            
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(content)
            
        photo = VehiclePhoto(
            reception_id=rec.id,
            file_path=f"/uploads/vehicles/{filename}"
        )
        db.add(photo)
        
    db.commit()
    db.refresh(rec)
    return {"message": "Fotoğraflar başarıyla yüklendi", "count": len(files)}



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
    
    receptions = q.order_by(VehicleReception.received_at.desc()).all()
    updated = False
    for r in receptions:
        if not r.qr_token:
            r.qr_token = uuid.uuid4().hex
            updated = True
    if updated:
        db.commit()
        for r in receptions:
            db.refresh(r)
            
    return receptions


@router.get("/{reception_id}", response_model=VehicleReceptionResponse)
def get_reception(reception_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")
    # Self-healing for qr_token
    if not rec.qr_token:
        rec.qr_token = uuid.uuid4().hex
        db.commit()
        db.refresh(rec)
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
        status="in_shop",
        qr_token=uuid.uuid4().hex
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

    # Self-healing for qr_token
    if not rec.qr_token:
        rec.qr_token = uuid.uuid4().hex

    update_data = data.model_dump(exclude_unset=True)

    # Durum "delivered" olursa teslim tarihini ayarla
    if update_data.get("status") == "delivered" and rec.status != "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc)
    elif update_data.get("status") in ("in_shop", "ready") and rec.status == "delivered":
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
    # Dosyayi sil
    full_path = os.path.join(UPLOAD_DIR, os.path.basename(photo.file_path))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(photo)
    db.commit()


@router.get("/{reception_id}/pdf")
def download_reception_pdf(reception_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")

    # Self-healing for qr_token
    if not rec.qr_token:
        rec.qr_token = uuid.uuid4().hex
        db.commit()
        db.refresh(rec)

    settings = db.query(CompanySettings).filter(CompanySettings.user_id == user.id).first()

    # Determine sharing URL base from incoming request headers/origin dynamically
    sharing_base_url = f"{request.url.scheme}://{request.url.netloc}"

    pdf_buffer = generate_vehicle_pdf(
        reception_number=str(rec.id),
        plate_number=rec.plate_number,
        owner_name=rec.owner_name or "—",
        owner_phone=rec.owner_phone or "—",
        vehicle_brand=rec.vehicle_brand or "—",
        vehicle_model=rec.vehicle_model or "—",
        vehicle_year=rec.vehicle_year,
        vehicle_color=rec.vehicle_color,
        km_reading=rec.km_reading,
        complaints=rec.complaints,
        diagnosis=rec.diagnosis,
        notes=rec.notes,
        received_at=rec.received_at,
        company_name=settings.company_name if settings else "",
        company_address=settings.company_address if settings else "",
        company_tax_office=settings.company_tax_office if settings else "",
        company_tax_number=settings.company_tax_number if settings else "",
        company_phone=settings.company_phone if settings else "",
        qr_token=rec.qr_token,
        sharing_base_url=sharing_base_url
    )

    filename = f"Arac_Kabul_{rec.plate_number}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{reception_id}/history", response_model=List[VehicleReceptionResponse])
def get_vehicle_reception_history(reception_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")
    
    # Query all historical visits for the same plate (excluding the current one)
    history = db.query(VehicleReception).filter(
        VehicleReception.user_id == user.id,
        VehicleReception.plate_number == rec.plate_number,
        VehicleReception.id != rec.id
    ).order_by(VehicleReception.received_at.desc()).all()
    
    # Self-healing for any historical records missing qr_token
    updated = False
    for r in history:
        if not r.qr_token:
            r.qr_token = uuid.uuid4().hex
            updated = True
    if updated:
        db.commit()

    return history


@router.get("/public/{qr_token}", response_model=PublicVehicleHistoryResponse)
@limiter.limit("10/minute")
def get_public_vehicle_history(qr_token: str, request: Request, db: Session = Depends(get_db)):
    rec = db.query(VehicleReception).filter(VehicleReception.qr_token == qr_token).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Gecerli bir servis kaydi bulunamadi.")
    
    # Query all historical visits under the same user_id for the same plate_number (including the current one)
    history_records = db.query(VehicleReception).filter(
        VehicleReception.user_id == rec.user_id,
        VehicleReception.plate_number == rec.plate_number
    ).order_by(VehicleReception.received_at.desc()).all()
    
    # Fetch company settings for workshop contact details
    settings = db.query(CompanySettings).filter(CompanySettings.user_id == rec.user_id).first()
    
    # Helper to mask PII data
    def mask_name(name: str) -> str:
        if not name:
            return "—"
        words = name.strip().split()
        masked_words = []
        for w in words:
            if len(w) <= 2:
                masked_words.append(w[0] + "*" * (len(w) - 1) if w else "")
            else:
                masked_words.append(w[:2] + "*" * (len(w) - 2))
        return " ".join(masked_words)
        
    def mask_phone(phone: str) -> str:
        if not phone:
            return "—"
        clean = "".join(filter(str.isdigit, phone))
        if len(clean) >= 7:
            # e.g., 05551234567 -> 0555 *** ** 67
            return f"{clean[:4]} *** ** {clean[-2:]}"
        return phone

    # Map current reception to Public schema with masked PII
    current_public = PublicVehicleReceptionResponse(
        id=rec.id,
        plate_number=rec.plate_number,
        owner_name=mask_name(rec.owner_name),
        owner_phone=mask_phone(rec.owner_phone),
        vehicle_brand=rec.vehicle_brand,
        vehicle_model=rec.vehicle_model,
        vehicle_year=rec.vehicle_year,
        vehicle_color=rec.vehicle_color,
        km_reading=rec.km_reading,
        complaints=rec.complaints,
        diagnosis=rec.diagnosis,
        status=rec.status,
        received_at=rec.received_at,
        delivered_at=rec.delivered_at,
        photos=[
            PublicVehiclePhotoResponse(
                id=p.id,
                file_path=p.file_path,
                created_at=p.created_at
            ) for p in rec.photos
        ]
    )
    
    # Map historical receptions to Public schemas with masked PII
    history_public = []
    for r in history_records:
        if r.id == rec.id:
            continue
        history_public.append(
            PublicVehicleReceptionResponse(
                id=r.id,
                plate_number=r.plate_number,
                owner_name=mask_name(r.owner_name),
                owner_phone=mask_phone(r.owner_phone),
                vehicle_brand=r.vehicle_brand,
                vehicle_model=r.vehicle_model,
                vehicle_year=r.vehicle_year,
                vehicle_color=r.vehicle_color,
                km_reading=r.km_reading,
                complaints=r.complaints,
                diagnosis=r.diagnosis,
                status=r.status,
                received_at=r.received_at,
                delivered_at=r.delivered_at,
                photos=[
                    PublicVehiclePhotoResponse(
                        id=p.id,
                        file_path=p.file_path,
                        created_at=p.created_at
                    ) for p in r.photos
                ]
            )
        )
        
    return PublicVehicleHistoryResponse(
        current_reception=current_public,
        history=history_public,
        company_name=settings.company_name if settings else "CNRStok Servis Istasyonu",
        company_phone=settings.company_phone if settings else "",
        company_address=settings.company_address if settings else ""
    )


@router.get("/{reception_id}/upload-token")
def get_upload_token(reception_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rec = db.query(VehicleReception).filter(
        VehicleReception.id == reception_id, VehicleReception.user_id == user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    
    # Generate secure short-lived token (10 minutes)
    payload = {
        "sub": str(user.id),
        "reception_id": rec.id,
        "type": "qr_upload",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {"token": token}





