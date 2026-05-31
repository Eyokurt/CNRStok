from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from database import engine, Base
from routers import customers, products, invoices, dashboard, settings, auth_router, vehicles
import os
import logging
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from config import limiter, settings as app_settings
from alembic.config import Config
from alembic import command

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("api")

def run_migrations():
    try:
        logger.info("Running database migrations...")
        ini_path = os.path.join(os.path.dirname(__file__), "alembic.ini")
        alembic_cfg = Config(ini_path)
        script_dir = os.path.join(os.path.dirname(__file__), "alembic")
        alembic_cfg.set_main_option("script_location", script_dir)
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully.")
    except Exception as e:
        logger.error(f"Failed to run database migrations: {e}", exc_info=True)

# Run migrations on startup
run_migrations()

app = FastAPI(
    title="Stok Takip ve Fatura Yönetim Sistemi",
    version="1.0.1",
    description="Müşteri, stok ve fatura yönetimi için modern API"
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during request {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Sistemsel bir hata olustu. Lutfen teknik ekiple iletisime gecin."}
    )


# CORS
origins = app_settings.ALLOWED_ORIGINS.split(",") if app_settings.ALLOWED_ORIGINS else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost", "http://localhost:5173", "http://127.0.0.1", "http://127.0.0.1:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Router'ları dahil et
app.include_router(auth_router.router)
app.include_router(customers.router)
app.include_router(products.router)
app.include_router(invoices.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(vehicles.router)

# ─── Vehicle Photo Uploads ──────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "vehicles")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads/vehicles", StaticFiles(directory=UPLOAD_DIR), name="vehicle_uploads")

# ─── Frontend Static Files (Production) ─────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    INDEX_HTML = os.path.join(FRONTEND_DIST, "index.html")

    # SPA Fallback Middleware — API olmayan GET isteklerinde index.html döndür
    class SPAMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            # Eğer 404 dönüyorsa ve API/docs isteği değilse → index.html sun
            if response.status_code == 404 and request.method == "GET":
                path = request.url.path
                if not path.startswith("/api/") and not path.startswith("/docs") and not path.startswith("/openapi") and not path.startswith("/uploads/"):
                    return FileResponse(INDEX_HTML)
            return response

    app.add_middleware(SPAMiddleware)

    # Static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    # Root sayfası
    @app.get("/")
    async def serve_index():
        return FileResponse(INDEX_HTML)
