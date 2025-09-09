# Database Schema Documentation
## Koperasi Sinoman SuperApp

### Table of Contents

1. [Overview](#overview)
2. [ERD Diagram](#erd-diagram)
3. [Core Modules](#core-modules)
4. [Table Descriptions](#table-descriptions)
5. [Relationships](#relationships)
6. [Sample Queries](#sample-queries)
7. [Views and Functions](#views-and-functions)

---

## Overview

Koperasi Sinoman SuperApp adalah sistem manajemen koperasi multi-tenant yang melayani kecamatan dan desa di Ponorogo. Sistem ini mencakup:

- **Multi-tenant architecture** untuk isolasi data per kecamatan/desa
- **Simpanan Anggota** dengan tiga jenis simpanan (pokok, wajib, sukarela)  
- **Bank Sampah** dengan sistem reward dan tracking
- **Fit Challenge** program 8 minggu dengan biometrik
- **E-commerce** produk lokal dengan pricing khusus member
- **Route Management** untuk pengangkutan sampah
- **Financial Management** dengan perhitungan SHU otomatis
- **Admin System** dengan audit trail dan notifications

---

## ERD Diagram

```mermaid
erDiagram
    %% Core Tables
    TENANTS {
        UUID id PK
        VARCHAR tenant_code UK
        VARCHAR tenant_name
        VARCHAR tenant_type
        TEXT address
        VARCHAR phone
        VARCHAR email
        BOOLEAN is_active
        JSONB settings
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    MEMBERS {
        UUID id PK
        UUID tenant_id FK
        VARCHAR member_number UK
        VARCHAR full_name
        VARCHAR email
        VARCHAR phone
        VARCHAR id_card_number UK
        DATE date_of_birth
        VARCHAR gender
        VARCHAR occupation
        TEXT address
        UUID referred_by FK
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ADMIN_USERS {
        UUID id PK
        UUID tenant_id FK
        VARCHAR username UK
        VARCHAR email UK
        TEXT password_hash
        VARCHAR full_name
        VARCHAR role
        JSONB permissions
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    %% Savings Module
    SAVINGS_ACCOUNTS {
        UUID id PK
        UUID member_id FK UK
        VARCHAR account_number UK
        DECIMAL pokok_balance
        DECIMAL wajib_balance
        DECIMAL sukarela_balance
        DECIMAL total_balance
        TIMESTAMP last_transaction_date
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    SAVINGS_TRANSACTIONS {
        UUID id PK
        UUID member_id FK
        UUID account_id FK
        VARCHAR transaction_code UK
        VARCHAR transaction_type
        VARCHAR savings_type
        DECIMAL amount
        DECIMAL balance_before
        DECIMAL balance_after
        TEXT description
        VARCHAR payment_method
        UUID verified_by FK
        TIMESTAMP created_at
    }

    %% Products & Orders
    PRODUCT_CATEGORIES {
        UUID id PK
        VARCHAR category_name
        TEXT description
        TEXT icon_url
        INTEGER sort_order
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PRODUCTS {
        UUID id PK
        UUID tenant_id FK
        VARCHAR sku UK
        VARCHAR product_name
        UUID category_id FK
        VARCHAR unit
        DECIMAL cost_price
        DECIMAL member_price
        DECIMAL public_price
        DECIMAL stock_quantity
        JSONB nutritional_info
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ORDERS {
        UUID id PK
        VARCHAR order_number UK
        UUID member_id FK
        TIMESTAMP order_date
        DECIMAL subtotal
        DECIMAL total_amount
        VARCHAR payment_method
        VARCHAR payment_status
        VARCHAR order_status
        UUID processed_by FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ORDER_ITEMS {
        UUID id PK
        UUID order_id FK
        UUID product_id FK
        VARCHAR product_name
        DECIMAL quantity
        DECIMAL unit_price
        DECIMAL subtotal
        TIMESTAMP created_at
    }

    %% Fit Challenge Module
    FIT_CHALLENGES {
        UUID id PK
        UUID tenant_id FK
        VARCHAR challenge_code UK
        VARCHAR challenge_name
        INTEGER batch_number
        DATE start_date
        DATE end_date
        DECIMAL registration_fee
        INTEGER max_participants
        INTEGER current_participants
        VARCHAR trainer_name
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    FIT_PARTICIPANTS {
        UUID id PK
        UUID member_id FK
        UUID challenge_id FK
        VARCHAR registration_number UK
        VARCHAR payment_status
        DECIMAL initial_weight
        DECIMAL current_weight
        DECIMAL target_weight
        INTEGER attendance_count
        INTEGER total_sessions
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    FIT_PROGRESS_WEEKLY {
        UUID id PK
        UUID participant_id FK
        INTEGER week_number
        DATE measurement_date
        DECIMAL weight
        DECIMAL body_fat_percentage
        DECIMAL muscle_mass
        TEXT trainer_notes
        TIMESTAMP created_at
    }

    %% Waste Bank Module
    WASTE_CATEGORIES {
        UUID id PK
        VARCHAR category_code UK
        VARCHAR category_name
        VARCHAR sub_category
        DECIMAL buying_price_per_kg
        DECIMAL selling_price_per_kg
        DECIMAL minimum_weight_kg
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    COLLECTION_POINTS {
        UUID id PK
        UUID tenant_id FK
        VARCHAR point_code UK
        VARCHAR point_name
        TEXT address
        VARCHAR rt
        VARCHAR rw
        DECIMAL latitude
        DECIMAL longitude
        DECIMAL storage_capacity_kg
        DECIMAL current_load_kg
        BOOLEAN has_maggot_facility
        DATE last_collection_date
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    WASTE_TRANSACTIONS {
        UUID id PK
        VARCHAR transaction_number UK
        UUID member_id FK
        UUID collection_point_id FK
        DATE transaction_date
        DECIMAL total_weight_kg
        DECIMAL total_value
        DECIMAL admin_fee
        DECIMAL net_value
        VARCHAR payment_method
        VARCHAR payment_status
        UUID savings_transaction_id FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    WASTE_TRANSACTION_DETAILS {
        UUID id PK
        UUID transaction_id FK
        UUID waste_category_id FK
        DECIMAL weight_kg
        DECIMAL price_per_kg
        DECIMAL subtotal
        VARCHAR condition_quality
        TIMESTAMP created_at
    }

    WASTE_BALANCES {
        UUID id PK
        UUID member_id FK UK
        DECIMAL total_weight_collected_kg
        DECIMAL total_earnings
        DECIMAL current_balance
        DECIMAL total_transferred
        DATE last_transaction_date
        TIMESTAMP updated_at
    }

    MAGGOT_CYCLES {
        UUID id PK
        UUID tenant_id FK
        VARCHAR cycle_code UK
        DATE start_date
        DATE harvest_date
        DECIMAL input_organic_waste_kg
        DECIMAL expected_maggot_yield_kg
        DECIMAL actual_maggot_yield_kg
        DECIMAL expected_kasgot_yield_kg
        DECIMAL actual_kasgot_yield_kg
        DECIMAL total_revenue
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    %% Route Management
    VEHICLES {
        UUID id PK
        UUID tenant_id FK
        VARCHAR vehicle_code UK
        VARCHAR vehicle_type
        VARCHAR vehicle_name
        VARCHAR plate_number
        DECIMAL capacity_kg
        VARCHAR fuel_type
        VARCHAR driver_name
        VARCHAR status
        DATE last_maintenance_date
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    COLLECTION_ROUTES {
        UUID id PK
        VARCHAR route_code UK
        VARCHAR route_name
        DATE route_date
        UUID vehicle_id FK
        VARCHAR driver_name
        TIME start_time
        TIME end_time
        DECIMAL total_distance_km
        DECIMAL total_weight_collected_kg
        VARCHAR status
        UUID created_by FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ROUTE_STOPS {
        UUID id PK
        UUID route_id FK
        UUID collection_point_id FK
        INTEGER stop_sequence
        DECIMAL estimated_weight_kg
        DECIMAL actual_weight_kg
        TIME arrival_time
        TIME departure_time
        VARCHAR status
        TIMESTAMP created_at
    }

    COLLECTION_REQUESTS {
        UUID id PK
        UUID collection_point_id FK
        VARCHAR requested_by
        DATE request_date
        DECIMAL estimated_weight_kg
        VARCHAR priority
        VARCHAR status
        UUID assigned_route_id FK
        TIMESTAMP created_at
    }

    %% Financial Module
    SHU_CALCULATIONS {
        UUID id PK
        UUID tenant_id FK
        INTEGER year
        DECIMAL total_revenue
        DECIMAL total_expenses
        DECIMAL gross_profit
        DECIMAL shu_amount
        DECIMAL member_distribution_percentage
        DECIMAL reserve_percentage
        DECIMAL management_percentage
        DATE calculation_date
        DATE approval_date
        UUID approved_by FK
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    SHU_DISTRIBUTIONS {
        UUID id PK
        UUID shu_calculation_id FK
        UUID member_id FK
        DECIMAL savings_points
        DECIMAL transaction_points
        DECIMAL total_points
        DECIMAL shu_amount
        DATE distribution_date
        VARCHAR payment_method
        VARCHAR payment_status
        UUID savings_transaction_id FK
        TIMESTAMP created_at
    }

    FINANCIAL_REPORTS {
        UUID id PK
        UUID tenant_id FK
        VARCHAR report_type
        VARCHAR report_period
        DECIMAL savings_revenue
        DECIMAL waste_revenue
        DECIMAL product_revenue
        DECIMAL fitness_revenue
        DECIMAL other_revenue
        DECIMAL total_revenue
        DECIMAL operational_expenses
        DECIMAL fuel_expenses
        DECIMAL maintenance_expenses
        DECIMAL salary_expenses
        DECIMAL other_expenses
        DECIMAL total_expenses
        DECIMAL net_profit
        DATE report_date
        UUID generated_by FK
        VARCHAR status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    %% System Tables
    NOTIFICATIONS {
        UUID id PK
        UUID recipient_id FK
        VARCHAR recipient_type
        VARCHAR title
        TEXT message
        VARCHAR type
        VARCHAR category
        TEXT action_url
        JSONB data
        BOOLEAN is_read
        TIMESTAMP read_at
        VARCHAR sent_via
        TIMESTAMP created_at
    }

    SETTINGS {
        UUID id PK
        UUID tenant_id FK
        VARCHAR setting_key
        JSONB setting_value
        TEXT description
        BOOLEAN is_public
        UUID updated_by FK
        TIMESTAMP updated_at
        TIMESTAMP created_at
    }

    AUDIT_LOGS {
        UUID id PK
        UUID tenant_id FK
        UUID user_id
        VARCHAR user_type
        VARCHAR action
        VARCHAR table_name
        UUID record_id
        JSONB old_values
        JSONB new_values
        INET ip_address
        TEXT user_agent
        TIMESTAMP created_at
    }

    SYSTEM_HEALTH {
        UUID id PK
        UUID tenant_id FK
        VARCHAR metric_name
        DECIMAL metric_value
        VARCHAR metric_unit
        VARCHAR status
        DECIMAL threshold_warning
        DECIMAL threshold_critical
        TEXT message
        TIMESTAMP checked_at
        TIMESTAMP created_at
    }

    %% Relationships
    TENANTS ||--o{ MEMBERS : has
    TENANTS ||--o{ ADMIN_USERS : manages
    TENANTS ||--o{ PRODUCTS : owns
    TENANTS ||--o{ COLLECTION_POINTS : has
    TENANTS ||--o{ VEHICLES : owns
    TENANTS ||--o{ FIT_CHALLENGES : organizes
    TENANTS ||--o{ MAGGOT_CYCLES : operates
    TENANTS ||--o{ SHU_CALCULATIONS : calculates
    TENANTS ||--o{ FINANCIAL_REPORTS : generates
    TENANTS ||--o{ SETTINGS : configures

    MEMBERS ||--|| SAVINGS_ACCOUNTS : has
    MEMBERS ||--o{ SAVINGS_TRANSACTIONS : makes
    MEMBERS ||--|| WASTE_BALANCES : has
    MEMBERS ||--o{ WASTE_TRANSACTIONS : performs
    MEMBERS ||--o{ ORDERS : places
    MEMBERS ||--o{ FIT_PARTICIPANTS : participates
    MEMBERS ||--o{ SHU_DISTRIBUTIONS : receives
    MEMBERS ||--o{ MEMBERS : refers

    ADMIN_USERS ||--o{ SAVINGS_TRANSACTIONS : verifies
    ADMIN_USERS ||--o{ ORDERS : processes
    ADMIN_USERS ||--o{ COLLECTION_ROUTES : creates
    ADMIN_USERS ||--o{ SHU_CALCULATIONS : approves
    ADMIN_USERS ||--o{ FINANCIAL_REPORTS : generates
    ADMIN_USERS ||--o{ SETTINGS : updates

    SAVINGS_ACCOUNTS ||--o{ SAVINGS_TRANSACTIONS : receives
    
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : categorizes
    PRODUCTS ||--o{ ORDER_ITEMS : includes

    ORDERS ||--o{ ORDER_ITEMS : contains

    FIT_CHALLENGES ||--o{ FIT_PARTICIPANTS : enrolls
    FIT_PARTICIPANTS ||--o{ FIT_PROGRESS_WEEKLY : tracks

    COLLECTION_POINTS ||--o{ WASTE_TRANSACTIONS : collects
    COLLECTION_POINTS ||--o{ ROUTE_STOPS : visits
    COLLECTION_POINTS ||--o{ COLLECTION_REQUESTS : requests

    WASTE_CATEGORIES ||--o{ WASTE_TRANSACTION_DETAILS : categorizes
    WASTE_TRANSACTIONS ||--o{ WASTE_TRANSACTION_DETAILS : details
    WASTE_TRANSACTIONS ||--o| SAVINGS_TRANSACTIONS : transfers

    VEHICLES ||--o{ COLLECTION_ROUTES : assigned
    COLLECTION_ROUTES ||--o{ ROUTE_STOPS : includes
    COLLECTION_ROUTES ||--o{ COLLECTION_REQUESTS : fulfills

    SHU_CALCULATIONS ||--o{ SHU_DISTRIBUTIONS : distributes
    SHU_DISTRIBUTIONS ||--o| SAVINGS_TRANSACTIONS : pays
```

---

## Core Modules

### 1. Multi-Tenant Management
- **Tenants**: Manajemen kecamatan/desa
- **Admin Users**: Pengelola dengan role-based access
- **Settings**: Konfigurasi per tenant

### 2. Member Management  
- **Members**: Data anggota dengan referral system
- **Savings**: Simpanan anggota (pokok, wajib, sukarela)
- **Notifications**: Sistem notifikasi

### 3. Waste Bank (Bank Sampah)
- **Collection Points**: Lokasi pengumpulan per RT/RW
- **Waste Categories**: Jenis sampah dengan pricing
- **Transactions**: Transaksi jual sampah
- **Maggot Production**: Produksi maggot dari organik

### 4. Route Management
- **Vehicles**: Fleet management
- **Collection Routes**: Rute harian pengambilan
- **Route Optimization**: Perencanaan rute efisien

### 5. Fit Challenge Program
- **8-Week Programs**: Program fitness dengan trainer
- **Biometric Tracking**: Monitoring weekly progress
- **Payment Integration**: Integrasi dengan simpanan

### 6. E-Commerce
- **Product Catalog**: Produk lokal
- **Order Management**: Sistem pemesanan
- **Member Pricing**: Harga khusus member

### 7. Financial Management
- **SHU Calculation**: Perhitungan otomatis
- **Financial Reports**: Laporan keuangan
- **Revenue Tracking**: Multi-stream revenue

---

## Table Descriptions

### Core Tables

#### `tenants`
Tabel utama untuk sistem multi-tenant yang menyimpan data kecamatan dan desa.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `tenant_code` (PON-001, DSA-002, etc.)
- **Key Fields**: `tenant_type` (kecamatan/desa/pusat), `settings` (JSONB)

#### `members`  
Tabel anggota koperasi dengan sistem referral dan multi-tenant.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants, `referred_by` → members
- **Unique Keys**: `member_number` (SIN-2024-00001), `id_card_number` (NIK)
- **Key Fields**: `status` (active/inactive/suspended), `referral_code`

#### `admin_users`
Tabel pengelola sistem dengan role-based access control.
- **Primary Key**: `id` (UUID)  
- **Foreign Keys**: `tenant_id` → tenants
- **Unique Keys**: `username`, `email`
- **Key Fields**: `role` (super_admin/admin/manager/staff/collector), `permissions` (JSONB)

### Savings Module

#### `savings_accounts`
Akun simpanan setiap member dengan 3 jenis simpanan.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `member_id` → members (UNIQUE)
- **Key Fields**: 
  - `pokok_balance`: Simpanan pokok (Rp 80,000)
  - `wajib_balance`: Simpanan wajib (Rp 10,000/bulan) 
  - `sukarela_balance`: Simpanan sukarela
  - `total_balance`: Computed field (pokok + wajib + sukarela)

#### `savings_transactions`
Transaksi simpanan dengan tracking balance dan verifikasi.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `member_id` → members, `account_id` → savings_accounts, `verified_by` → admin_users
- **Unique Keys**: `transaction_code` (TRX-2024-000001)
- **Key Fields**: `transaction_type` (deposit/withdrawal/transfer/shu), `savings_type` (pokok/wajib/sukarela)

### Products & E-Commerce

#### `product_categories`
Kategori produk untuk klasifikasi barang.
- **Primary Key**: `id` (UUID)
- **Key Fields**: `category_name` (Protein/Sayuran/Organik), `sort_order`

#### `products`
Katalog produk dengan pricing bertingkat dan inventory management.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants, `category_id` → product_categories
- **Unique Keys**: `sku`
- **Key Fields**: 
  - `cost_price`: Harga modal
  - `member_price`: Harga khusus member koperasi
  - `public_price`: Harga untuk non-member
  - `nutritional_info`: Info gizi dalam JSONB

#### `orders` & `order_items`
Sistem pemesanan dengan status tracking dan snapshot pricing.
- **orders**: Header order dengan payment dan delivery info
- **order_items**: Detail item dengan snapshot nama dan harga produk

### Fit Challenge Module

#### `fit_challenges`
Program fit challenge 8 minggu dengan batch management.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants
- **Unique Keys**: `challenge_code` (FC-2024-01)
- **Key Fields**: `registration_fee` (default Rp 600,000), `max_participants`, `current_participants`

#### `fit_participants`
Peserta fit challenge dengan data biometrik dan progress tracking.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `member_id` → members, `challenge_id` → fit_challenges
- **Key Fields**: Data biometrik (weight, body_fat, muscle_mass), `attendance_count`, `completion_percentage`

#### `fit_progress_weekly`
Progress mingguan peserta selama 8 minggu program.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `participant_id` → fit_participants
- **Key Fields**: `week_number` (1-8), measurements, `trainer_notes`

### Waste Bank Module

#### `waste_categories`
Kategori sampah dengan pricing buy/sell dan minimum weight.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `category_code` (WST-001)
- **Key Fields**: `buying_price_per_kg`, `selling_price_per_kg`, `minimum_weight_kg`

#### `collection_points`
Lokasi bank sampah per RT/RW dengan capacity management.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants
- **Unique Keys**: `point_code` (BS-PON-001)
- **Key Fields**: `storage_capacity_kg`, `current_load_kg`, `has_maggot_facility`, GPS coordinates

#### `waste_transactions`
Transaksi bank sampah dengan auto-transfer ke savings.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `member_id` → members, `collection_point_id` → collection_points, `savings_transaction_id` → savings_transactions
- **Unique Keys**: `transaction_number` (WB-2024-000001)
- **Key Fields**: `net_value` (computed: total_value - admin_fee), `payment_method` (cash/savings_transfer)

#### `waste_balances`
Saldo bank sampah per member dengan tracking transfer.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `member_id` → members (UNIQUE)
- **Key Fields**: `total_earnings`, `current_balance`, `total_transferred`

#### `maggot_cycles`
Siklus produksi maggot dari sampah organik.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants
- **Unique Keys**: `cycle_code` (MGT-2024-01)
- **Key Fields**: Expected vs actual yield untuk maggot dan kasgot, revenue tracking

### Route Management

#### `vehicles`
Fleet management kendaraan pengangkut.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants
- **Unique Keys**: `vehicle_code` (VH-001)
- **Key Fields**: `capacity_kg`, `fuel_consumption_km_per_liter`, `status` (available/in_route/maintenance)

#### `collection_routes`
Rute pengambilan sampah harian dengan tracking.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `vehicle_id` → vehicles, `created_by` → admin_users
- **Unique Keys**: `route_code` (RT-2024-01-15-001)
- **Key Fields**: `total_weight_collected_kg` (computed), `total_distance_km`, `fuel_cost`

#### `route_stops`
Perhentian dalam setiap rute dengan sequence dan timing.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `route_id` → collection_routes, `collection_point_id` → collection_points
- **Key Fields**: `stop_sequence`, `estimated_weight_kg` vs `actual_weight_kg`, arrival/departure times

### Financial Module

#### `shu_calculations`
Perhitungan SHU (Sisa Hasil Usaha) tahunan per tenant.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants, `approved_by` → admin_users
- **Key Fields**: 
  - `gross_profit`: Computed (total_revenue - total_expenses)
  - Distribution percentages: 70% member, 20% reserve, 10% management
  - `status` (draft/approved/distributed)

#### `shu_distributions`
Pembagian SHU ke setiap anggota berdasarkan poin aktivitas.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `shu_calculation_id` → shu_calculations, `member_id` → members, `savings_transaction_id` → savings_transactions
- **Key Fields**: `savings_points`, `transaction_points`, `total_points` (computed), `shu_amount`

#### `financial_reports`
Laporan keuangan multi-periode dengan breakdown revenue/expense.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants, `generated_by` → admin_users
- **Key Fields**: Revenue streams (savings, waste, product, fitness), expense categories, `net_profit` (computed)

### System Tables

#### `notifications`
Sistem notifikasi untuk member dan admin dengan multiple channels.
- **Primary Key**: `id` (UUID)
- **Key Fields**: `recipient_type` (member/admin), `type` (info/success/warning/error), `sent_via` (in_app/email/whatsapp/sms)

#### `audit_logs`
Audit trail semua aktivitas sistem untuk compliance.
- **Primary Key**: `id` (UUID)
- **Key Fields**: `user_type` (member/admin/system), `action`, `old_values`/`new_values` (JSONB)

#### `settings`
Konfigurasi sistem per tenant dengan public/private settings.
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `tenant_id` → tenants, `updated_by` → admin_users
- **Key Fields**: `setting_value` (JSONB), `is_public`

---

## Relationships

### Primary Relationships

#### Multi-Tenant Relationships
```
tenants (1) ←→ (N) members
tenants (1) ←→ (N) admin_users  
tenants (1) ←→ (N) products
tenants (1) ←→ (N) collection_points
tenants (1) ←→ (N) vehicles
tenants (1) ←→ (N) fit_challenges
```

#### Member-Centric Relationships
```
members (1) ←→ (1) savings_accounts
members (1) ←→ (N) savings_transactions
members (1) ←→ (1) waste_balances
members (1) ←→ (N) waste_transactions
members (1) ←→ (N) orders
members (1) ←→ (N) fit_participants
members (1) ←→ (N) shu_distributions
members (1) ←→ (N) members (referral)
```

#### Product & Order Flow
```
product_categories (1) ←→ (N) products
products (1) ←→ (N) order_items
orders (1) ←→ (N) order_items
members (1) ←→ (N) orders
admin_users (1) ←→ (N) orders (processes)
```

#### Waste Management Flow
```
collection_points (1) ←→ (N) waste_transactions
waste_categories (1) ←→ (N) waste_transaction_details
waste_transactions (1) ←→ (N) waste_transaction_details
waste_transactions (1) ←→ (1) savings_transactions (auto-transfer)
```

#### Route Management Flow
```
vehicles (1) ←→ (N) collection_routes
collection_routes (1) ←→ (N) route_stops
collection_points (1) ←→ (N) route_stops
collection_points (1) ←→ (N) collection_requests
collection_routes (1) ←→ (N) collection_requests (assigned)
```

#### Fit Challenge Flow  
```
fit_challenges (1) ←→ (N) fit_participants
fit_participants (1) ←→ (N) fit_progress_weekly
members (1) ←→ (N) fit_participants
```

#### Financial Flow
```
shu_calculations (1) ←→ (N) shu_distributions
shu_distributions (1) ←→ (1) savings_transactions
tenants (1) ←→ (N) shu_calculations
tenants (1) ←→ (N) financial_reports
```

### Cross-Module Integrations

#### Waste → Savings Integration
- `waste_transactions.savings_transaction_id` → `savings_transactions.id`
- Auto-transfer waste earnings ke simpanan sukarela
- Update `waste_balances.total_transferred`

#### SHU → Savings Integration  
- `shu_distributions.savings_transaction_id` → `savings_transactions.id`
- Auto-transfer SHU distribution ke simpanan member

#### Admin Verification Links
- `savings_transactions.verified_by` → `admin_users.id`
- `orders.processed_by` → `admin_users.id`
- `collection_routes.created_by` → `admin_users.id`

---

## Sample Queries

### Member Management Queries

#### 1. Get Member Dashboard Summary
```sql
SELECT 
    m.full_name,
    m.member_number,
    sa.total_balance as savings_balance,
    wb.current_balance as waste_balance,
    wb.total_weight_collected_kg,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT fp.id) as active_fit_challenges,
    COUNT(DISTINCT CASE WHEN n.is_read = false THEN n.id END) as unread_notifications
FROM members m
LEFT JOIN savings_accounts sa ON sa.member_id = m.id
LEFT JOIN waste_balances wb ON wb.member_id = m.id
LEFT JOIN orders o ON o.member_id = m.id AND o.order_status = 'delivered'
LEFT JOIN fit_participants fp ON fp.member_id = m.id AND fp.status = 'active'
LEFT JOIN notifications n ON n.recipient_id = m.id AND n.recipient_type = 'member'
WHERE m.id = $1
GROUP BY m.id, m.full_name, m.member_number, sa.total_balance, wb.current_balance, wb.total_weight_collected_kg;
```

#### 2. Member Referral Tree
```sql
WITH RECURSIVE referral_tree AS (
    -- Base case: root member
    SELECT id, full_name, member_number, referred_by, 1 as level
    FROM members 
    WHERE id = $1
    
    UNION ALL
    
    -- Recursive case: find referrals
    SELECT m.id, m.full_name, m.member_number, m.referred_by, rt.level + 1
    FROM members m
    INNER JOIN referral_tree rt ON m.referred_by = rt.id
    WHERE rt.level < 5 -- Limit depth to prevent infinite recursion
)
SELECT * FROM referral_tree ORDER BY level, full_name;
```

### Savings Queries

#### 3. Member Savings History
```sql
SELECT 
    st.transaction_code,
    st.transaction_type,
    st.savings_type,
    st.amount,
    st.balance_before,
    st.balance_after,
    st.description,
    st.payment_method,
    au.full_name as verified_by_name,
    st.created_at
FROM savings_transactions st
LEFT JOIN admin_users au ON au.id = st.verified_by
WHERE st.member_id = $1
ORDER BY st.created_at DESC
LIMIT 50;
```

#### 4. Monthly Savings Summary per Tenant
```sql
SELECT 
    t.tenant_name,
    DATE_TRUNC('month', st.created_at) as month,
    st.savings_type,
    COUNT(st.id) as transaction_count,
    SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN st.transaction_type = 'withdrawal' THEN st.amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN st.transaction_type = 'deposit' THEN st.amount ELSE -st.amount END) as net_amount
FROM savings_transactions st
JOIN members m ON m.id = st.member_id
JOIN tenants t ON t.id = m.tenant_id
WHERE st.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY t.tenant_name, DATE_TRUNC('month', st.created_at), st.savings_type
ORDER BY t.tenant_name, month DESC, st.savings_type;
```

### Waste Bank Queries

#### 5. Collection Points with Priority Status
```sql
SELECT 
    cp.point_name,
    cp.rt,
    cp.rw,
    cp.current_load_kg,
    cp.storage_capacity_kg,
    ROUND((cp.current_load_kg / cp.storage_capacity_kg) * 100, 1) as capacity_percentage,
    COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) as days_since_collection,
    CASE 
        WHEN cp.current_load_kg / cp.storage_capacity_kg >= 0.9 OR 
             COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) >= 7 THEN 'urgent'
        WHEN cp.current_load_kg / cp.storage_capacity_kg >= 0.7 OR 
             COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) >= 5 THEN 'high'
        WHEN cp.current_load_kg / cp.storage_capacity_kg >= 0.5 OR 
             COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) >= 3 THEN 'medium'
        ELSE 'low'
    END as priority_level,
    cp.contact_person,
    cp.contact_phone
FROM collection_points cp
WHERE cp.tenant_id = $1 AND cp.is_active = true
ORDER BY 
    CASE 
        WHEN cp.current_load_kg / cp.storage_capacity_kg >= 0.9 OR 
             COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) >= 7 THEN 1
        WHEN cp.current_load_kg / cp.storage_capacity_kg >= 0.7 OR 
             COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) >= 5 THEN 2
        WHEN cp.current_load_kg / cp.storage_capacity_kg >= 0.5 OR 
             COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) >= 3 THEN 3
        ELSE 4
    END,
    cp.current_load_kg DESC;
```

#### 6. Daily Waste Collection Report
```sql
SELECT 
    cp.point_name,
    COUNT(wt.id) as total_transactions,
    COUNT(DISTINCT wt.member_id) as unique_members,
    SUM(wt.total_weight_kg) as total_weight_kg,
    SUM(wt.net_value) as total_value,
    AVG(wt.total_weight_kg) as avg_weight_per_transaction,
    AVG(wt.net_value) as avg_value_per_transaction
FROM collection_points cp
LEFT JOIN waste_transactions wt ON wt.collection_point_id = cp.id 
    AND wt.transaction_date = $2 -- date parameter
WHERE cp.tenant_id = $1
    AND cp.is_active = true
GROUP BY cp.id, cp.point_name
ORDER BY total_weight_kg DESC NULLS LAST;
```

#### 7. Member Waste Bank Performance
```sql
SELECT 
    m.member_number,
    m.full_name,
    wb.total_weight_collected_kg,
    wb.total_earnings,
    wb.current_balance,
    wb.total_transferred,
    COUNT(wt.id) as total_transactions,
    AVG(wt.total_weight_kg) as avg_weight_per_transaction,
    MAX(wt.transaction_date) as last_transaction_date,
    CASE 
        WHEN wb.total_weight_collected_kg >= 100 THEN 'platinum'
        WHEN wb.total_weight_collected_kg >= 50 THEN 'gold'
        WHEN wb.total_weight_collected_kg >= 20 THEN 'silver'
        WHEN wb.total_weight_collected_kg >= 5 THEN 'bronze'
        ELSE 'starter'
    END as tier_level
FROM members m
JOIN waste_balances wb ON wb.member_id = m.id
LEFT JOIN waste_transactions wt ON wt.member_id = m.id
WHERE m.tenant_id = $1 AND m.status = 'active'
GROUP BY m.id, m.member_number, m.full_name, wb.total_weight_collected_kg, 
         wb.total_earnings, wb.current_balance, wb.total_transferred
ORDER BY wb.total_weight_collected_kg DESC;
```

### Product & E-Commerce Queries

#### 8. Product Performance Report
```sql
SELECT 
    p.product_name,
    p.sku,
    pc.category_name,
    p.member_price,
    p.public_price,
    p.stock_quantity,
    COUNT(oi.id) as total_orders,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.subtotal) as total_revenue,
    SUM(oi.subtotal - (oi.quantity * p.cost_price)) as total_profit,
    AVG(oi.unit_price) as avg_selling_price,
    MAX(o.order_date) as last_order_date
FROM products p
JOIN product_categories pc ON pc.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.order_status = 'delivered'
WHERE p.tenant_id = $1 
    AND p.is_active = true
    AND (o.order_date IS NULL OR o.order_date >= CURRENT_DATE - INTERVAL '30 days')
GROUP BY p.id, p.product_name, p.sku, pc.category_name, 
         p.member_price, p.public_price, p.stock_quantity
ORDER BY total_revenue DESC NULLS LAST;
```

#### 9. Low Stock Alert
```sql
SELECT 
    p.product_name,
    p.sku,
    pc.category_name,
    p.stock_quantity,
    p.minimum_stock,
    (p.stock_quantity - p.minimum_stock) as stock_difference,
    p.supplier_name,
    p.supplier_phone,
    AVG(oi.quantity) as avg_monthly_sales
FROM products p
JOIN product_categories pc ON pc.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id 
    AND o.order_status = 'delivered'
    AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.tenant_id = $1
    AND p.is_active = true
    AND p.stock_quantity <= p.minimum_stock
GROUP BY p.id, p.product_name, p.sku, pc.category_name, 
         p.stock_quantity, p.minimum_stock, p.supplier_name, p.supplier_phone
ORDER BY (p.stock_quantity - p.minimum_stock) ASC;
```

### Fit Challenge Queries

#### 10. Fit Challenge Progress Tracking
```sql
SELECT 
    fc.challenge_name,
    fp.registration_number,
    m.full_name as participant_name,
    fp.initial_weight,
    fp.target_weight,
    fp.current_weight,
    (fp.initial_weight - fp.current_weight) as weight_lost,
    fp.attendance_count,
    fp.total_sessions,
    ROUND((fp.attendance_count::DECIMAL / fp.total_sessions) * 100, 1) as attendance_percentage,
    fp.payment_status,
    -- Latest progress
    pw_latest.weight as latest_recorded_weight,
    pw_latest.body_fat_percentage as latest_body_fat,
    pw_latest.measurement_date as last_measurement_date
FROM fit_challenges fc
JOIN fit_participants fp ON fp.challenge_id = fc.id
JOIN members m ON m.id = fp.member_id
LEFT JOIN LATERAL (
    SELECT weight, body_fat_percentage, measurement_date
    FROM fit_progress_weekly
    WHERE participant_id = fp.id
    ORDER BY week_number DESC
    LIMIT 1
) pw_latest ON true
WHERE fc.id = $1
ORDER BY fp.registration_date;
```

#### 11. Weekly Progress Report for Participant
```sql
SELECT 
    pw.week_number,
    pw.measurement_date,
    pw.weight,
    pw.body_fat_percentage,
    pw.muscle_mass,
    pw.waist_circumference,
    pw.chest_circumference,
    pw.trainer_notes,
    pw.participant_feedback,
    -- Calculate changes from previous week
    LAG(pw.weight) OVER (ORDER BY pw.week_number) as prev_weight,
    (pw.weight - LAG(pw.weight) OVER (ORDER BY pw.week_number)) as weight_change,
    (pw.body_fat_percentage - LAG(pw.body_fat_percentage) OVER (ORDER BY pw.week_number)) as body_fat_change
FROM fit_progress_weekly pw
WHERE pw.participant_id = $1
ORDER BY pw.week_number;
```

### Route Management Queries

#### 12. Daily Route Efficiency Report
```sql
SELECT 
    cr.route_code,
    cr.route_name,
    cr.route_date,
    v.vehicle_name,
    v.plate_number,
    cr.driver_name,
    COUNT(rs.id) as total_stops,
    COUNT(CASE WHEN rs.status = 'completed' THEN 1 END) as completed_stops,
    COUNT(CASE WHEN rs.status = 'skipped' THEN 1 END) as skipped_stops,
    cr.total_distance_km,
    cr.total_weight_collected_kg,
    cr.fuel_cost,
    CASE 
        WHEN cr.total_distance_km > 0 THEN cr.total_weight_collected_kg / cr.total_distance_km
        ELSE 0
    END as kg_per_km_efficiency,
    CASE 
        WHEN cr.total_weight_collected_kg > 0 THEN cr.fuel_cost / cr.total_weight_collected_kg
        ELSE 0
    END as fuel_cost_per_kg,
    cr.start_time,
    cr.end_time,
    (EXTRACT(EPOCH FROM (cr.end_time::TIME - cr.start_time::TIME)) / 3600)::DECIMAL(4,2) as total_hours
FROM collection_routes cr
JOIN vehicles v ON v.id = cr.vehicle_id
LEFT JOIN route_stops rs ON rs.route_id = cr.id
WHERE cr.route_date = $1 -- date parameter
    AND EXISTS (
        SELECT 1 FROM vehicles v2 
        WHERE v2.id = cr.vehicle_id AND v2.tenant_id = $2 -- tenant_id parameter
    )
GROUP BY cr.id, cr.route_code, cr.route_name, cr.route_date, 
         v.vehicle_name, v.plate_number, cr.driver_name,
         cr.total_distance_km, cr.total_weight_collected_kg, 
         cr.fuel_cost, cr.start_time, cr.end_time
ORDER BY kg_per_km_efficiency DESC;
```

#### 13. Vehicle Utilization Report
```sql
SELECT 
    v.vehicle_code,
    v.vehicle_name,
    v.vehicle_type,
    v.capacity_kg,
    v.status,
    COUNT(cr.id) as total_routes_this_month,
    SUM(cr.total_distance_km) as total_distance_km,
    SUM(cr.total_weight_collected_kg) as total_weight_collected_kg,
    SUM(cr.fuel_cost) as total_fuel_cost,
    AVG(cr.total_weight_collected_kg) as avg_weight_per_route,
    MAX(cr.total_weight_collected_kg) as max_weight_per_route,
    ROUND((AVG(cr.total_weight_collected_kg) / v.capacity_kg) * 100, 1) as avg_capacity_utilization,
    CASE 
        WHEN SUM(cr.total_distance_km) > 0 THEN SUM(cr.fuel_cost) / SUM(cr.total_distance_km)
        ELSE 0
    END as fuel_cost_per_km
FROM vehicles v
LEFT JOIN collection_routes cr ON cr.vehicle_id = v.id
    AND cr.route_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND cr.status = 'completed'
WHERE v.tenant_id = $1 AND v.is_active = true
GROUP BY v.id, v.vehicle_code, v.vehicle_name, v.vehicle_type, 
         v.capacity_kg, v.status
ORDER BY total_weight_collected_kg DESC NULLS LAST;
```

### Financial & SHU Queries

#### 14. SHU Calculation with Member Distribution
```sql
-- Get SHU calculation details
SELECT 
    sc.year,
    sc.total_revenue,
    sc.total_expenses,
    sc.gross_profit,
    sc.shu_amount,
    sc.member_distribution_percentage,
    sc.reserve_percentage,
    sc.management_percentage,
    sc.status,
    sc.calculation_date,
    sc.approval_date,
    au.full_name as approved_by_name,
    -- Calculate distribution amounts
    (sc.shu_amount * sc.member_distribution_percentage / 100) as member_pool_amount,
    (sc.shu_amount * sc.reserve_percentage / 100) as reserve_amount,
    (sc.shu_amount * sc.management_percentage / 100) as management_amount,
    -- Count distributions
    COUNT(sd.id) as total_member_distributions,
    SUM(sd.shu_amount) as total_distributed_to_members,
    AVG(sd.shu_amount) as avg_distribution_per_member
FROM shu_calculations sc
LEFT JOIN admin_users au ON au.id = sc.approved_by
LEFT JOIN shu_distributions sd ON sd.shu_calculation_id = sc.id
WHERE sc.tenant_id = $1 AND sc.year = $2
GROUP BY sc.id, sc.year, sc.total_revenue, sc.total_expenses, sc.gross_profit,
         sc.shu_amount, sc.member_distribution_percentage, sc.reserve_percentage,
         sc.management_percentage, sc.status, sc.calculation_date, sc.approval_date,
         au.full_name;
```

#### 15. Member SHU Distribution Details
```sql
SELECT 
    m.member_number,
    m.full_name,
    sd.savings_points,
    sd.transaction_points,
    sd.total_points,
    sd.shu_amount,
    sd.payment_status,
    sd.distribution_date,
    st.transaction_code as savings_transaction_code,
    -- Calculate member contribution percentages
    ROUND((sd.total_points / total_member_points.sum_points) * 100, 2) as points_percentage,
    ROUND((sd.shu_amount / total_distributions.sum_amount) * 100, 2) as amount_percentage
FROM shu_distributions sd
JOIN members m ON m.id = sd.member_id
LEFT JOIN savings_transactions st ON st.id = sd.savings_transaction_id
CROSS JOIN (
    SELECT SUM(total_points) as sum_points
    FROM shu_distributions
    WHERE shu_calculation_id = $1
) total_member_points
CROSS JOIN (
    SELECT SUM(shu_amount) as sum_amount
    FROM shu_distributions
    WHERE shu_calculation_id = $1
) total_distributions
WHERE sd.shu_calculation_id = $1
ORDER BY sd.shu_amount DESC;
```

#### 16. Monthly Financial Overview per Tenant
```sql
SELECT 
    t.tenant_name,
    fr.report_period,
    fr.savings_revenue,
    fr.waste_revenue,
    fr.product_revenue,
    fr.fitness_revenue,
    fr.other_revenue,
    fr.total_revenue,
    fr.operational_expenses,
    fr.fuel_expenses,
    fr.maintenance_expenses,
    fr.salary_expenses,
    fr.other_expenses,
    fr.total_expenses,
    fr.net_profit,
    CASE 
        WHEN fr.total_revenue > 0 THEN ROUND((fr.net_profit / fr.total_revenue) * 100, 2)
        ELSE 0
    END as profit_margin_percentage,
    fr.status,
    fr.report_date,
    au.full_name as generated_by_name
FROM financial_reports fr
JOIN tenants t ON t.id = fr.tenant_id
LEFT JOIN admin_users au ON au.id = fr.generated_by
WHERE fr.tenant_id = $1 
    AND fr.report_type = 'monthly'
    AND fr.report_period >= TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
ORDER BY fr.report_period DESC;
```

### System Monitoring Queries

#### 17. System Health Dashboard
```sql
SELECT 
    t.tenant_name,
    sh.metric_name,
    sh.metric_value,
    sh.metric_unit,
    sh.status,
    sh.threshold_warning,
    sh.threshold_critical,
    sh.message,
    sh.checked_at,
    CASE 
        WHEN sh.status = 'critical' THEN 1
        WHEN sh.status = 'warning' THEN 2
        WHEN sh.status = 'healthy' THEN 3
    END as priority_order
FROM system_health sh
LEFT JOIN tenants t ON t.id = sh.tenant_id
WHERE sh.checked_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY priority_order, sh.checked_at DESC;
```

#### 18. Recent Audit Logs with Context
```sql
SELECT 
    al.created_at,
    t.tenant_name,
    al.user_type,
    CASE 
        WHEN al.user_type = 'admin' THEN au.full_name
        WHEN al.user_type = 'member' THEN m.full_name
        ELSE 'System'
    END as user_name,
    al.action,
    al.table_name,
    al.record_id,
    al.ip_address,
    al.request_method,
    al.request_path,
    al.response_status,
    al.execution_time_ms,
    -- Show key changes for important tables
    CASE 
        WHEN al.table_name = 'members' AND al.action = 'UPDATE' THEN
            COALESCE(al.new_values->>'status', '') || 
            CASE WHEN al.old_values->>'status' != al.new_values->>'status' THEN 
                ' (was: ' || COALESCE(al.old_values->>'status', '') || ')'
            ELSE ''
            END
        WHEN al.table_name = 'waste_transactions' AND al.action = 'INSERT' THEN
            'Amount: ' || COALESCE(al.new_values->>'net_value', '0')
        WHEN al.table_name = 'orders' AND al.action = 'UPDATE' THEN
            COALESCE(al.new_values->>'order_status', '')
        ELSE ''
    END as key_changes
FROM audit_logs al
LEFT JOIN tenants t ON t.id = al.tenant_id
LEFT JOIN admin_users au ON au.id = al.user_id AND al.user_type = 'admin'
LEFT JOIN members m ON m.id = al.user_id AND al.user_type = 'member'
WHERE al.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY al.created_at DESC
LIMIT 100;
```

---

## Views and Functions

### Key Views

#### `collection_points_dashboard`
Real-time monitoring collection points dengan priority calculation.
```sql
SELECT * FROM collection_points_dashboard 
WHERE tenant_id = $1 
ORDER BY priority_level, capacity_percentage DESC;
```

#### `member_performance_summary`  
Summary performa member dengan tier system.
```sql
SELECT * FROM member_performance_summary 
WHERE tenant_id = $1 AND member_tier IN ('gold', 'platinum')
ORDER BY total_waste_kg DESC;
```

#### `tenant_financial_overview`
Overview keuangan bulanan per tenant.
```sql
SELECT * FROM tenant_financial_overview 
WHERE total_current_month_revenue > 0
ORDER BY total_current_month_revenue DESC;
```

### Key Functions

#### `get_member_dashboard_summary(member_id)`
Fungsi untuk mendapatkan ringkasan dashboard member.
```sql
SELECT * FROM get_member_dashboard_summary('123e4567-e89b-12d3-a456-426614174000');
```

#### `get_daily_waste_report(tenant_id, date)`
Laporan harian waste bank per tenant.
```sql
SELECT * FROM get_daily_waste_report(
    '123e4567-e89b-12d3-a456-426614174000', 
    CURRENT_DATE
);
```

#### `calculate_distance_km(lat1, lon1, lat2, lon2)`
Menghitung jarak GPS menggunakan Haversine formula.
```sql
SELECT calculate_distance_km(-7.123456, 111.654321, -7.234567, 111.765432);
```

#### `calculate_maggot_yield(organic_waste_kg, yield_percentage)`
Estimasi hasil produksi maggot.
```sql
SELECT * FROM calculate_maggot_yield(500.00, 20);
-- Returns: expected_maggot_kg, expected_kasgot_kg, cycle_duration_days
```

#### `monthly_maintenance()`
Fungsi untuk maintenance rutin sistem.
```sql
SELECT * FROM monthly_maintenance();
```

### Auto-Generation Functions

- `generate_member_number(tenant_code)`: Format SIN-2024-00001
- `generate_account_number()`: Format SA-000001  
- `generate_transaction_code()`: Format TRX-2024-000001
- `generate_order_number()`: Format ORD-2024-000001
- `generate_waste_transaction_number()`: Format WB-2024-000001
- `generate_challenge_code()`: Format FC-2024-01
- `generate_route_code()`: Format RT-2024-01-15-001
- `generate_maggot_cycle_code()`: Format MGT-2024-01

---

## Security Features

### Row Level Security (RLS)
Semua tabel menggunakan RLS untuk isolasi data:
- **Multi-tenant isolation**: Data per tenant terpisah
- **Member self-access**: Member hanya akses data mereka
- **Admin role-based**: Admin akses berdasarkan role dan tenant
- **Super admin override**: Super admin akses semua data

### Audit Trail
- **Complete audit logs**: Semua perubahan data tercatat
- **User context**: Tracking user yang melakukan perubahan
- **Before/after values**: Record nilai sebelum dan sesudah
- **IP and user agent**: Tracking sumber perubahan

### Data Validation
- **Check constraints**: Validasi di level database  
- **Foreign key integrity**: Konsistensi relasi
- **Unique constraints**: Mencegah duplikasi
- **Computed fields**: Konsistensi perhitungan

---

## Performance Optimizations

### Indexing Strategy
- **Primary keys**: UUID dengan B-tree index
- **Foreign keys**: Index untuk join performance
- **Query patterns**: Index berdasarkan pola query umum
- **Composite index**: Multi-column untuk query kompleks

### Generated Columns
- `savings_accounts.total_balance`: Otomatis calculated
- `waste_transactions.net_value`: Total value - admin fee
- `shu_distributions.total_points`: Savings + transaction points
- `financial_reports.total_revenue/expenses`: Sum dari kategori

### Triggers for Automation
- **Auto-generate codes**: Nomor unik otomatis
- **Balance updates**: Update saldo otomatis
- **Status synchronization**: Sync status antar tabel
- **Notification creation**: Notifikasi otomatis
- **Audit logging**: Logging otomatis

### Views for Performance
- **Pre-aggregated data**: View dengan perhitungan complex
- **Join optimization**: Reduce join complexity
- **Report ready**: Data siap untuk reporting

---

Dokumentasi ini mencakup struktur lengkap database Koperasi Sinoman SuperApp dengan fokus pada multi-tenant architecture, business logic integration, dan performance optimization. Sistem dirancang untuk scalability dan maintainability dengan automation features yang comprehensive.