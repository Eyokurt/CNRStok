#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   StokTakip - Fatura Yönetim Sistemi    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Proje kök dizinine git
cd "$(dirname "$0")"

# ── Python kontrolü ──
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[HATA] Python bulunamadı! Lütfen Python 3.8+ kurun."
    exit 1
fi
PYTHON=$(command -v python3 || command -v python)

# ── Node.js kontrolü ──
if ! command -v node &> /dev/null; then
    echo "[HATA] Node.js bulunamadı! Lütfen Node.js 20+ kurun."
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
    echo "[HATA] Sistemdeki Node.js sürümü çok eski (v$NODE_VER). TailwindCSS v4 ve React Router v7 için Node.js 20+ gereklidir."
    echo "Lütfen Node.js'i güncelleyin: https://nodejs.org/ veya nvm (Node Version Manager) kullanın."
    exit 1
fi

# ── Backend bağımlılıkları ──
echo "[1/4] Backend bağımlılıkları kuruluyor..."
cd backend
if [ ! -d "venv" ]; then
    echo "Virtual environment (venv) oluşturuluyor..."
    $PYTHON -m venv venv
    if [ $? -ne 0 ]; then
        echo "[HATA] venv oluşturulamadı. 'python3-venv' paketinin kurulu olduğundan emin olun."
        echo "Örn: sudo apt install python3-venv"
        exit 1
    fi
fi
source venv/bin/activate
$PYTHON -m pip install -r requirements.txt --break-system-packages
cd ..

# ── Frontend bağımlılıkları ──
echo "[2/4] Frontend bağımlılıkları kuruluyor..."
cd frontend
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo "Bağımlılıklar eksik, baştan kuruluyor..."
    rm -rf node_modules package-lock.json
    npm install
else
    # Hata alma ihtimaline karşı normal kurulum
    npm install
fi

# ── Frontend build ──
echo "[3/4] Frontend derleniyor..."
npm run build
cd ..

# ── Sunucuyu başlat ──
echo "[4/4] Sunucu başlatılıyor..."
echo ""
echo "────────────────────────────────────────────"
echo "  Uygulama: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Durdurmak için: Ctrl+C"
echo "────────────────────────────────────────────"
echo ""

cd backend
# Backend venv active from before? No, we cd'd back out. Activate again.
source venv/bin/activate
$PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000
