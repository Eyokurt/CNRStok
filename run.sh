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
    echo "[HATA] Node.js bulunamadı! Lütfen Node.js 18+ kurun."
    exit 1
fi

# ── Backend bağımlılıkları ──
echo "[1/4] Backend bağımlılıkları kuruluyor..."
cd backend
$PYTHON -m pip install -r requirements.txt -q 2>/dev/null
cd ..

# ── Frontend bağımlılıkları ──
echo "[2/4] Frontend bağımlılıkları kuruluyor..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent 2>/dev/null
fi

# ── Frontend build ──
echo "[3/4] Frontend derleniyor..."
npm run build --silent 2>/dev/null
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
$PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000
