import hashlib
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from config import settings

# ─── Config ───
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_HOURS = settings.ACCESS_TOKEN_EXPIRE_MINUTES / 60

# ─── Password Hashing ───

def _prehash(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("ascii")


def hash_password(password: str) -> str:
    pwd_bytes = _prehash(password).encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = _prehash(plain).encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        # Fallback in case raw password was saved or other hashing mismatch
        try:
            return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False

# ─── JWT Token ───
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Tum korumali endpoint'lerde kullanilacak dependency"""
    from models import User  # circular import engellemek icin
    from jose.exceptions import ExpiredSignatureError
    
    if not token:
        token = request.query_params.get("token")
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Gecersiz token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    expired_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Oturum suresi doldu. Lutfen tekrar giris yapin.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except ExpiredSignatureError:
        raise expired_exception
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
