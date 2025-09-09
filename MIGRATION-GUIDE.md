# Bank Sampah Database Migration Guide

This guide will help you apply the Bank Sampah database migrations to enable full API functionality.

## Prerequisites

1. **Supabase Account Access**: Admin access to your Supabase project
2. **Service Role Key**: Required for advanced operations (optional for basic setup)
3. **Database URL**: Your Supabase database connection string

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Access SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply Bank Sampah Migration
Copy and paste the contents of `database/migrations/002_bank_sampah_tables.sql` into the SQL editor and execute.

**Key Tables Created:**
- `waste_types` - Waste category definitions with pricing
- `waste_collection_points` - Collection location management  
- `waste_collections` - Individual deposit transactions
- `waste_collection_items` - Line items for each collection
- `waste_bank_accounts` - Member savings accounts
- `waste_bank_transactions` - Account transaction history
- `maggot_batches` - Maggot farming batch management
- `maggot_batch_inputs` - Organic waste inputs for batches
- `maggot_harvests` - Harvest records and revenue tracking

### Step 3: Verify Installation
Run this verification query:
```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'waste_types', 
    'waste_collections', 
    'maggot_batches',
    'waste_bank_accounts'
  )
ORDER BY table_name;
```

Should return 4 tables if migration was successful.

## Method 2: Automated Script

### Step 1: Set Environment Variables
Ensure your `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Run Migration Script
```bash
node scripts/apply-migrations.js
```

### Step 3: Verify with Test Script
```bash
node scripts/check-tables.js
```

## Method 3: Manual Table Creation (Alternative)

If automated methods fail, manually create tables using the SQL from the migration file.

### Critical Tables (Priority Order):
1. **waste_types** - Must be created first (referenced by other tables)
2. **waste_collection_points** - Collection locations
3. **waste_collections** - Main collection records
4. **waste_collection_items** - Collection line items
5. **waste_bank_accounts** - Member accounts
6. **waste_bank_transactions** - Account transactions
7. **maggot_batches** - Maggot farming batches
8. **maggot_batch_inputs** - Batch inputs
9. **maggot_harvests** - Harvest records

## Sample Data Setup (Optional)

After migration, you can populate with sample data:

### Sample Waste Types
```sql
INSERT INTO waste_types (tenant_id, name, category, unit, price_per_unit, is_organic, suitable_for_maggot) VALUES
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Plastik Botol', 'plastic', 'kg', 3000.00, false, false),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Kardus', 'paper', 'kg', 3000.00, false, false),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Kaleng Aluminium', 'metal', 'kg', 7000.00, false, false),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Sampah Dapur', 'organic', 'kg', 1500.00, true, true),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Sisa Sayuran', 'organic', 'kg', 1200.00, true, true);
```

### Sample Collection Point
```sql
INSERT INTO waste_collection_points (tenant_id, name, code, address, manager_id, status, capacity_kg) VALUES
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Pos Utama', 'POS-001', 'Jl. Merdeka No. 123', 
 (SELECT id FROM members WHERE tenant_id = '4aa453df-34c3-48e6-93c8-e6aafcd71cc7' LIMIT 1), 
 'active', 1000.00);
```

## Testing the Migration

### 1. API Endpoint Tests
```bash
# Test waste types API
curl "http://localhost:3001/api/waste-types?tenant_id=4aa453df-34c3-48e6-93c8-e6aafcd71cc7"

# Test collections API
curl "http://localhost:3001/api/waste-collections?tenant_id=4aa453df-34c3-48e6-93c8-e6aafcd71cc7"

# Test maggot batches API
curl "http://localhost:3001/api/maggot-batches?tenant_id=4aa453df-34c3-48e6-93c8-e6aafcd71cc7"
```

### 2. Run Test Suite
```bash
# Test Bank Sampah APIs
node tests/bank-sampah-api.test.js

# Test E-Commerce APIs
node tests/ecommerce-api.test.js
```

### 3. Check Frontend Pages
- **Admin Dashboard**: http://localhost:3001/admin/waste
- **Deposit Interface**: http://localhost:3001/deposit  
- **Maggot Farming**: http://localhost:3001/maggot
- **Waste Bank Overview**: http://localhost:3001/waste-bank

## Expected Results

### Before Migration:
- APIs return "table not found" errors
- 27.3% API success rate
- Frontend shows mock data only

### After Migration:
- All APIs functional with real database
- 90%+ API success rate expected
- Frontend connected to live data
- Full waste bank functionality enabled

## Troubleshooting

### Common Issues:

1. **"Table already exists" errors**: 
   - Tables may have been partially created
   - Use `DROP TABLE IF EXISTS table_name CASCADE` before recreation

2. **Foreign key constraint errors**:
   - Ensure `tenants` and `members` tables exist first
   - Check tenant UUID format is correct

3. **Permission denied errors**:
   - Verify service role key has sufficient permissions
   - Check Row Level Security (RLS) policies

4. **API still returning 500 errors**:
   - Restart development server: `npm run dev`
   - Check server logs for specific database errors
   - Verify environment variables are loaded

### Getting Help:
- Check Supabase logs in dashboard
- Review migration file for syntax errors
- Test individual table creation queries
- Verify tenant IDs match existing data

## Success Indicators

✅ **Migration Successful When:**
- All 9 Bank Sampah tables created
- API endpoints return 200 status codes
- Test suites show improved success rates
- Frontend interfaces display real data
- Waste deposit workflow functions end-to-end

The Bank Sampah module will be fully operational after successful migration!