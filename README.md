# 📦 Stok Takip ve Fatura Yönetim Sistemi (Production Edition)

Modern, güvenilir ve yüksek performanslı işletme yönetim yazılımı. Bu uygulama, Müşteri Yönetimi (CRM), Stok Takibi, Fatura Kesimi ve Servis / Araç Kabul süreçlerini uçtan uca yönetmenizi sağlar.

## ✨ Özellikler

- **Müşteri & Cari Yönetimi**: İşyeri, plaka, iletişim ve adres bilgilerini kayıt altına alın.
- **Stok Kontrolü**: Ürünlerinizi, stok miktarlarınızı, eşik kritik seviyelerini ve fiyatlarını takip edin.
- **Fatura & Finans**: Müşteriye özel veya perakende olarak indirim ve KDV oranlı PDF formatında A4 fatura (veya servis irsaliyesi) kesin.
- **Araç & Servis Kabul (Oto Servisler İçin)**: Servise gelen aracı kaydedin, şikayet ve arıza tespiti (diagnoz) yapın, fotoğraflarla belgeleyin ve süreçleri "Teslim Edildi/Dükkanda" statüleriyle yönetin.
- **Dinamik Firma Ayarları**: Antetli kağıdınıza (PDF çıktısına) yansıyacak olan firma unvanınızı, adresinizi ve vergi bilgilerinizi tek ekrandan güncelleyin.
- **Karanlık Mod (Dark Mode)**: Göz yormayan, modern siyah/koyu tema altyapısı mevcuttur.
- **Premium Arayüz**: Şık ve modern Toaster bildirimleri ile üst düzey kullanıcı deneyimi.

---

## 🚀 Kurulum (Docker ile Tek Tıkla Dağıtım)

En iyi performans ve güvenli çalıştırma için uygulama **Docker** ile paketlenmiştir.

### Gereksinimler

- Bilgisayarınızda veya sunucunuzda [Docker](https://docs.docker.com/get-docker/) ve [Docker Compose](https://docs.docker.com/compose/install/) kurulu olmalıdır.

### İlk Kurulum

1. Proje dosyalarını sunucuya veya yerel makinenize kopyalayın.
2. Ana dizinde terminal açarak şu komutu çalıştırın:

```bash
docker-compose up -d --build
```

3. Docker konteynerleri (Frontend Nginx, Backend FastAPI, PostgreSQL) indirilip başlatılacaktır.
4. Ağ tarayıcınızdan **`http://localhost`** sayfasına giderek uygulamaya giriş yapabilirsiniz.

_(Not: Veritabanı tablolarınız uygulamaya girer girmez otomatik oluşur ve Alembic ile kontrol edilir.)_

---

## 🔧 Geliştirici Ortamı (Yerel Kurulum)

Kodu değiştirmek isteyen yazılımcılar için manuel kurulum:

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # (Windows için: venv\Scripts\activate)
pip install -r requirements.txt
alembic upgrade head # Schema güncellemelerini başlat
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React / Vite)

```bash
cd frontend
npm install
npm run dev
```

---

## 🛠 Teknoloji Yığını (Tech Stack)

- **Frontend:** React 19, Tailwind CSS v4, React Router, Vite, React Hot Toast
- **Backend:** Python 3.12, FastAPI, SQLAlchemy (ORM), Alembic (Migrations), Pydantic
- **Veritabanı:** PostgreSQL 15 (Docker üzerinden) / SQLite (Geliştirici ortamı fall-back yedek)
- **Deployment:** Docker, Docker Compose, Nginx Alpine

---

## 🔒 Güvenlik Notu

`.env` dosyanızı veya `docker-compose.yml` içerisindeki şifreleri, özellikle `SECRET_KEY` ve PostgreSQL parolalarını, canlı üretim (production) sunucusunda çalıştırmadan önce mutlaka benzersiz güçlü şifrelerle değiştirmeniz tavsiye edilir.
