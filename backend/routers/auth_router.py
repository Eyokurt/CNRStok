from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse, Token
from auth import hash_password, verify_password, create_access_token, get_current_user
from config import limiter, settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=Token, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Yeni kullanıcı kaydı"""
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Şifre en az 8 karakter olmalıdır")
        
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        business_name=data.business_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    """Giriş yap ve JWT token al (Rate Limited)"""
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı"
        )

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    """Mevcut kullanıcı bilgisi"""
    return user
