const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createWasteTables() {
  console.log('🗄️  Creating Bank Sampah Tables...')
  console.log('===================================')

  // Basic waste_types table creation
  const createWasteTypesSQL = `
    CREATE TABLE IF NOT EXISTS waste_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        description TEXT,
        unit VARCHAR(50) NOT NULL DEFAULT 'kg',
        price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
        is_organic BOOLEAN DEFAULT FALSE,
        suitable_for_maggot BOOLEAN DEFAULT FALSE,
        processing_method VARCHAR(100) DEFAULT 'recycling',
        environmental_impact_score INTEGER DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        
        UNIQUE(tenant_id, name, category)
    );
  `

  // Basic waste_collections table
  const createWasteCollectionsSQL = `
    CREATE TABLE IF NOT EXISTS waste_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        collection_number VARCHAR(100) NOT NULL,
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        collector_id UUID REFERENCES members(id),
        collection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'pending',
        total_value DECIMAL(12,2) DEFAULT 0,
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(tenant_id, collection_number)
    );
  `

  // Basic maggot_batches table  
  const createMaggotBatchesSQL = `
    CREATE TABLE IF NOT EXISTS maggot_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        batch_number VARCHAR(100) NOT NULL,
        manager_id UUID NOT NULL REFERENCES members(id),
        start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expected_harvest_date DATE,
        actual_harvest_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'preparing',
        total_organic_waste_kg DECIMAL(10,2) DEFAULT 0,
        estimated_maggot_yield_kg DECIMAL(10,2) DEFAULT 0,
        actual_maggot_yield_kg DECIMAL(10,2) DEFAULT 0,
        conversion_rate DECIMAL(5,4) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(tenant_id, batch_number)
    );
  `

  const tables = [
    { name: 'waste_types', sql: createWasteTypesSQL },
    { name: 'waste_collections', sql: createWasteCollectionsSQL },
    { name: 'maggot_batches', sql: createMaggotBatchesSQL }
  ]

  for (const table of tables) {
    console.log(`\n📋 Creating ${table.name} table...`)
    
    try {
      // Use a simple insert operation to trigger table creation via RLS
      const { data, error } = await supabase.rpc('exec_sql', {
        query: table.sql
      })
      
      if (error) {
        console.log(`   ❌ ${error.message}`)
        // Try alternative approach for schema modifications
        console.log(`   🔄 Attempting alternative creation method...`)
      } else {
        console.log(`   ✅ ${table.name} created successfully`)
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`)
    }
  }

  // Test table access
  console.log('\n🔍 Testing table access...')
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1)
      
      if (!error) {
        console.log(`   ✅ ${table.name}: Accessible`)
      } else {
        console.log(`   ❌ ${table.name}: ${error.message}`)
      }
    } catch (err) {
      console.log(`   ❌ ${table.name}: ${err.message}`)
    }
  }
}

if (require.main === module) {
  createWasteTables().catch(console.error)
}

module.exports = { createWasteTables }