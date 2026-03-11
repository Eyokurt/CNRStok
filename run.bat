@echo off
chcp 65001 >nul
title StokTakip - Fatura Yönetim Sistemi
echo.
echo ╔══════════════════════════════════════════╗
echo ║   StokTakip - Fatura Yönetim Sistemi    ║
echo ╚══════════════════════════════════════════╝
echo.

:: Proje kök dizinini belirle
cd /d "%~dp0"

:: ── Python kontrolü ──
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python bulunamadi! python.org adresinden yukleyin.
    pause
    exit /b 1
)

:: ── Node.js kontrolü ──
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js bulunamadi! nodejs.org adresinden yukleyin.
    pause
    exit /b 1
)

:: ── Backend bağımlılıkları ──
echo [1/4] Backend bagimliliklari kuruluyor...
cd backend
pip install -r requirements.txt -q >nul 2>&1
cd ..

:: ── Frontend bağımlılıkları ──
echo [2/4] Frontend bagimliliklari kuruluyor...
cd frontend
if not exist node_modules (
    call npm install --silent >nul 2>&1
)

:: ── Frontend build ──
echo [3/4] Frontend derleniyor...
call npm run build >nul 2>&1
cd ..

:: ── Sunucuyu başlat ──
echo [4/4] Sunucu baslatiliyor...
echo.
echo ────────────────────────────────────────────
echo   Uygulama: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Durdurmak icin: Ctrl+C
echo ────────────────────────────────────────────
echo.

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
