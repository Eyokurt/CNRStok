# Project Memory: Stok Takip ve Fatura Yönetim Sistemi (CNRStok)

This document contains a complete map, architectural overview, and technical details of the Stock Tracking and Invoice Management System (CNRStok). It serves as a persistent reference point for codebase structure, data models, APIs, and deployment processes.

---

## 📂 Exact Folder Locations & Directory Map

```text
c:\Users\eyupc\Documents\CNRStok
│   .gitignore
│   docker-compose.yml              # Multi-container production deployment (FastAPI, Nginx, PostgreSQL)
│   README.md                       # High-level system overview
│   requirements.txt                # Root Python dependencies
│   run.bat                         # Dev/prod Windows runner script (builds React, launches FastAPI)
│   run.sh                          # Dev/prod Linux runner script
│
├───backend                         # FastAPI Backend
│   │   .python-version
│   │   alembic.ini                 # Alembic configuration for DB migrations
│   │   auth.py                     # Auth logic (JWT, password hashing via sha256 + bcrypt)
│   │   config.py                   # App config, environment variables, rate limiting setup
│   │   database.py                 # SQLAlchemy engine and session management (get_db dependency)
│   │   Dockerfile                  # Docker configuration for FastAPI runtime
│   │   main.py                     # Application entry point, mounts static routes, custom middlewares
│   │   models.py                   # SQLAlchemy database models (Users, Customers, Products, etc.)
│   │   pdf_generator.py            # ReportLab PDF invoice generation (supports Turkish font encoding)
│   │   requirements.txt            # Backend dependencies
│   │   schemas.py                  # Pydantic schemas (DTOs) for request validation & responses
│   │
│   ├───alembic                     # Alembic Migration Directory
│   │   │   env.py
│   │   │   README
│   │   │   script.py.mako
│   │   │
│   │   └───versions
│   │           a8b2c6d4e2f1_add_storage_location.py # Added storage location column and index
│   │           8b3f7f86d123_add_qr_token.py       # Added indexed unique QR token column
│   │           942b8fbb4cd9_initial_migration.py  # Consolidated initial database schema structure
│   │
│   └───routers                     # REST API Endpoint Routers
│           auth_router.py          # User authentication endpoints (/register, /login, /me)
│           customers.py            # Customer & Cari management endpoints (/api/customers)
│           dashboard.py            # Aggregate dashboard statistics (/api/dashboard)
│           invoices.py             # Invoice creation, itemization, and PDF downloads (/api/invoices)
│           products.py             # Product stock and category management (/api/products)
│           settings.py             # Company setting configuration (/api/settings)
│           vehicles.py             # Vehicle reception and photography uploads (/api/vehicles)
│
└───frontend                        # React + Vite Frontend
    │   .gitignore
    │   Dockerfile                  # Multi-stage production build configuration (Nginx + static build)
    │   eslint.config.js
    │   index.html                  # Single Page Application HTML shell
    │   nginx.conf                  # Nginx server proxy settings (serves React, forwards API calls)
    │   package-lock.json
    │   package.json                # Project dependencies (React 19, Tailwind CSS v4, React Router, etc.)
    │   README.md
    │   vite.config.js
    │
    ├───public                      # Public static assets
    │       favicon.ico
    │
    └───src                         # Source Code
        │   api.js                  # Axios client setup, interceptors (injects JWT, redirects on 401)
        │   App.jsx                 # Routing configuration and global ProtectedRoute logic
        │   index.css               # Core CSS & Tailwind CSS v4 theme definitions
        │   main.jsx                # Application root mount
        │   ThemeContext.jsx        # Context managing Dark Mode / Light Mode state
        │
        ├───components              # Reusable Layouts & Components
        │       Layout.jsx          # Dashboard layout (Sidebar, top nav, user session, theme toggle)
        │
        └───pages                   # Screen Views / Pages
                Customers.jsx       # Customer database with Search, Add, Edit, Delete modals
                Dashboard.jsx       # Top metrics dashboard with critical low stock reminders
                InvoiceCreate.jsx   # Interactive invoice builder (autocomplete customer/product, discount/KDV calculations)
                Invoices.jsx        # List of past invoices with PDF download & direct browser print iframe triggers
                Login.jsx           # Clean Tabbed Login/Register Screen
                Products.jsx        # Product database (Barcode, Category, Critical Levels, Edit/Delete modals)
                Settings.jsx        # Company preferences form (Header metadata for invoice outputs)
                SharedVehicleHistory.jsx # Unauthenticated dynamic customer tracking & repair status dashboard
                VehicleReception.jsx# Workshop logs, vehicle cards (Complaints, diagnosis, photos, status badges)
```

---

## 🛠️ Technology Stack

| Layer | Component | Details |
|---|---|---|
| **Backend** | Framework | **FastAPI** (Python 3.12/3.13 compat) |
| | ORM / Engine | **SQLAlchemy** (using connection pooling & model relationships) |
| | Database | **SQLite** (Default local fallback) / **PostgreSQL 15** (Docker default) |
| | Migrations | **Alembic** (fully consolidated migrations run dynamically on FastAPI startup) |
| | Security | **JWT Tokens** (`python-jose`), Passwords hashed using standard `bcrypt` & `sha256` hashing |
| | Rate Limiting | **SlowAPI** (IP-based rate limits on security & public public-tracking endpoints) |
| | PDF Engine | **ReportLab** (Arial font, two-column layouts, local vector-based QR Code widgets) |
| **Frontend** | Build / Runtime | **React 19** with **Vite** |
| | Styling | **Tailwind CSS v4** (utilizing new `@theme` API in `index.css`) |
| | Navigation | **React Router DOM v6** (Nested routing, protected auth routes, public shared pages) |
| | HTTP Client | **Axios** (intercepted requests inject auth headers, responses redirect 401s to `/login`) |
| | QR Generator | **qrcode.react** (SVG vector QR codes rendered directly on client dialogs) |
| | Notifications| **React Hot Toast** (toasters for standard UX states) |
| **DevOps** | Containerization| **Docker & Docker Compose** (3-container runtime: `db`, `backend`, `frontend`) |
| | Web Server | **Nginx Alpine** (reverse proxying requests to FastAPI container) |

---

## 💾 Core Database Schema & Relations

The application defines a strict data schema in `backend/models.py`. Every data row is isolated at the tenant/user level via `user_id` foreign keys.

```mermaid
erDiagram
    users ||--o{ customers : "manages"
    users ||--o{ products : "manages"
    users ||--o{ invoices : "manages"
    users ||--o{ vehicle_receptions : "manages"
    users ||--o| company_settings : "configures"
    
    customers ||--o{ invoices : "billed_to"
    invoices ||--|{ invoice_items : "contains"
    products ||--o{ invoice_items : "referenced_in"
    vehicle_receptions ||--o{ vehicle_photos : "attaches"

    users {
        int id PK
        string username UNIQUE
        string password_hash
        string business_name
        datetime created_at
    }

    customers {
        int id PK
        int user_id FK
        string business_name
        string tax_office
        string tax_number
        string phone
        string address
        string plate_number
        datetime created_at
    }

    products {
        int id PK
        int user_id FK
        string name
        string barcode
        float unit_price
        int stock_quantity
        string category
        int critical_level
        string storage_location "nullable"
        datetime created_at
    }

    invoices {
        int id PK
        int user_id FK
        string invoice_number UNIQUE
        int customer_id FK
        float subtotal
        float discount_rate
        float discount_amount
        float kdv_rate
        float kdv_amount
        float total
        datetime created_at
    }

    invoice_items {
        int id PK
        int invoice_id FK
        int product_id FK "nullable"
        string description "extra items description"
        int quantity
        float unit_price
        float total_price
    }

    company_settings {
        int id PK
        int user_id FK UNIQUE
        string company_name
        string company_address
        string company_tax_office
        string company_tax_number
        string company_phone
    }

    vehicle_receptions {
        int id PK
        int user_id FK
        string plate_number
        string owner_name
        string owner_phone
        string vehicle_brand
        string vehicle_model
        int vehicle_year
        string vehicle_color
        int km_reading
        string complaints
        string diagnosis
        string notes
        string status "in_shop / ready / delivered"
        datetime received_at
        datetime delivered_at
        string qr_token UNIQUE
    }

    vehicle_photos {
        int id PK
        int reception_id FK
        string file_path
        datetime created_at
    }
```

### Key Performance Database Indexes
- **Customer Unique Index:** `idx_user_plate` on `(user_id, plate_number)` (ensures no duplicate plate numbers per user).
- **Customer Query Index:** `idx_business_name` on `(business_name)` (speeds up customer queries).
- **Product Unique Index:** `idx_user_barcode` on `(user_id, barcode)` (prevents duplicate barcodes per user).
- **Product Query Index:** `idx_product_name` on `(name)` (speeds up product searches).
- **Product Query Index:** `ix_products_storage_location` on `(storage_location)` (speeds up warehouse location queries).

---

## 🔌 API Endpoints Mapping

All backend endpoints are sub-routed under `/api`:

### 🔐 1. Auth Endpoint Router (`/api/auth`)
- `POST /register`: Registers a new user. Returns a JWT access token and user info.
- `POST /login`: Standard username/password validation. Rate limited. Returns a JWT access token.
- `GET /me`: Fetches the current authenticated user's profile details.

### 👥 2. Customer Endpoint Router (`/api/customers`)
- `GET /`: Lists all customers owned by the user.
- `GET /search?q={search_term}`: Autocomplete search looking up plate number or company name (returns max 10).
- `GET /{customer_id}`: Retrieves details of a specific customer.
- `POST /`: Creates a new customer. Prevents duplicate plate numbers.
- `PUT /{customer_id}`: Modifies a customer's records.
- `DELETE /{customer_id}`: Removes a customer.

### 📦 3. Product Endpoint Router (`/api/products`)
- `GET /?category={cat}`: Lists products with optional category filters.
- `GET /search?q={search_term}`: Searches products by name or barcode (returns max 10).
- `GET /{product_id}`: Retrieves a specific product.
- `POST /`: Creates a new product. Validates barcode uniqueness.
- `PUT /{product_id}`: Updates stock amounts, prices, categories, or names.
- `DELETE /{product_id}`: Deletes a product.
- `GET /{product_id}/history`: Fetches 24-month sales history and estimated stock history for analytics.

### 🧾 4. Invoice Endpoint Router (`/api/invoices`)
- `GET /`: Lists all generated invoices sorted by newest.
- `GET /{invoice_id}`: Retrieves comprehensive invoice itemization.
- `POST /`: Generates a new invoice. Decrements stock levels of items sold. Calculates discounts, VAT (KDV), and totals.
- `GET /{invoice_id}/pdf`: Dynamically generates and returns a PDF file stream with professional styling and company branding.

### 📊 5. Dashboard Endpoint Router (`/api/dashboard`)
- `GET /`: Pulls metrics for total customers, products, invoices, total calculated revenue, and a list of all products below their critical stock levels.

### ⚙️ 6. Settings Endpoint Router (`/api/settings`)
- `GET /`: Fetches the company settings (or initializes empty default if none exists).
- `PUT /`: Updates company settings (company name, phone, address, tax records).

### 🚗 7. Vehicle Reception Endpoint Router (`/api/vehicles`)
- `GET /?status={status}&search={search}`: Lists active workshop records with brand, plate, and status filters.
- `GET /{reception_id}`: Retrieves a single reception ticket.
- `POST /`: Admits a new vehicle (status initialized to `in_shop`).
- `PUT /{reception_id}`: Updates diagnoses, complaints, and changes status (sets `delivered_at` timestamps on delivery).
- `DELETE /{reception_id}`: Deletes the record and purges all uploaded vehicle images from the filesystem.
- `GET /{reception_id}/upload-token`: Issues short-lived signed JWT upload tokens.
- `GET /public-upload-details`: Safely retrieves vehicle metadata using the token.
- `POST /public-upload-photos`: Supports multiple file uploads, strict file validation, and rate-limiting.
- `GET /{reception_id}/pdf`: Returns a professionally formatted A4 PDF acceptance sheet with dynamic vector-based tracking QR code.
- `GET /{reception_id}/history`: Fetches past maintenance history for returning vehicles by vehicle plate matching.
- `GET /public/{qr_token}`: Public unauthenticated endpoint fetching dynamic repair stats, timelines, and photos with dynamic GDPR-compliant PII masking.

---

## 📈 Completed and Ongoing Product-Level Enhancements

CNRStok has been upgraded with the following production-ready features:

1. **Alembic Database Schema Migration Alignment (Completed)**: Wrote structured Alembic database migrations cleanly aligned with model metadata. Integrated dynamic HEAD upgrades directly into the FastAPI application startup wrapper (`backend/main.py`) for zero-config deployments.
2. **Robust Validation Layers (Completed)**: Enforced strict validation protocols on plates (regex verifying letters and numbers, length limits), customer phone formats (10 or 11 digits starting with `0`), tax codes (VKN/TCKN), and numeric fields (non-negative unit prices, stock metrics, and critical levels).
3. **Advanced Logging & Global Exception Handler (Completed)**: Configured uniform standard logging, intercepting all runtime exceptions globally to output dynamic masked error sheets to clients to prevent backend PII and environmental leakage.
4. **Enhanced PDF Layouts (Completed)**: Designed vector-drawn QR codes directly into reception forms using ReportLab, including Deep Indigo high-fidelity grid layouts, signature boxes, and wrapped paragraphs for clean layouts.
5. **Frontend State & UI Optimizations (Completed)**: Replaced browser alerts with custom modal cards, structured responsive list loading state skeletons, implemented automated JWT expiration notifications, and polished dark/light color rules with smooth SVG navigations.
6. **Secure QR-Code Tracking & Stepper Status (Completed)**: Enabled unauthenticated client dashboards with secure rate-limited endpoints (10 reqs/min per IP via SlowAPI) masking name/phone fields, combined with a 4-stage tracking workflow (`Kabul Edildi` -> `İşlemde / Onarımda` -> `Teslim Alınmaya Hazır` -> `Teslim Edildi`).
7. **Premium Product Analytics Popups & Custom SVG Charts (Completed)**: Made products clickable on the stock page to open a dual-pane details popup. The right pane draws an interactive, beautiful, custom Vanilla SVG Area Chart showing 24-month sales history and estimated stock history (utilizing mathematical reverse reconstruction backwards from current stock). Includes a vertical tracker guide, glowing nodes, and custom HTML hover tooltips. Refactored global page fade-in animation rules to remove trailing layout transitions that broke browser positioning for absolute/fixed elements.
8. **Interactive Warehouse Stock Location & Autocompletion suggester (Completed)**: Added a nullable indexed `storage_location` column to track where products are stored (e.g. shelves, bins, sections). Enforced this field in product creation and updates, equipped with a client-side suggester dropdown matching active locations to prevent duplicate entry names. Implemented a beautiful dual-tab structure ("Ürün Listesi" and "Konum Bazlı Dağılım") to group and list products dynamically inside premium location card containers.
9. **Minimalist Modern UI Redesign & Premium Color Palette (Completed)**: Transited the entire user interface from a bubbly, generic "AI-generated" visual style to a sharp, modern, and minimalist design language. Integrated the specific premium color palette (`061E29` deep slate cyan backdrop, `1D546D` oceanic blue-teal primary accent, `5F9598` sage-teal secondary accent, and `F3F4F4` cool light gray surface backdrop). Redefined Tailwind CSS v4 custom theme scales and systematically normalized border radii globally (restraining buttons, inputs, cards, and modals to a subtle 4px–8px range instead of excessive rounded corners). Replaced all high-saturation gradient metric cards on the Dashboard with flat, adaptive layouts and custom pastel icon badges. Updated hardcoded indigo coordinates inside Products SVG analytics charts, customer-facing QR status tracking portals (`SharedVehicleHistory.jsx`), and workshop QR sharing dialogs (`VehicleReception.jsx`) for unified design cohesion.

