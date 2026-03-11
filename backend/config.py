from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address

# Load .env file if running locally
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Stok Takip ve Fatura Yönetim Sistemi"
    PROJECT_VERSION: str = "1.0.0"
    
    # Use SQLite by default for simple local dev, but allow PostgreSQL via env var
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stok_takip.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_SECRET_KEY_PLEASE_CHANGE_IN_PRODUCTION")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Advanced Security
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "") # comma separated
    RATE_LIMIT_LOGIN: str = "5/minute"
    
    class Config:
        case_sensitive = True

settings = Settings()

# Global Rate Limiter
limiter = Limiter(key_func=get_remote_address)
