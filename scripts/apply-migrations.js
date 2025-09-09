const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigrations() {
  console.log('🗄️  Applying Database Migrations...')
  console.log('=======================================')

  // Critical migrations in order
  const migrationFiles = [
    '001_tenants.sql',
    '002_members.sql', 
    '003_savings.sql',
    '005_products.sql',
    '003_ecommerce_tables.sql',
    '002_bank_sampah_tables.sql'
  ]

  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} not found, skipping...`)
      continue
    }

    console.log(`\n📄 Applying ${file}...`)
    
    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8')
      
      // Execute the SQL content directly 
      const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent })
      
      if (error) {
        console.log(`   ⚠️  ${error.message}`)
        console.log(`   (This may be expected for CREATE IF NOT EXISTS statements)`)
      } else {
        console.log(`   ✅ Applied successfully`)
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`)
    }
  }

  console.log('\n=======================================')
  console.log('✅ Migration application complete!')
  
  // Verify key tables
  console.log('\n🔍 Verifying key tables exist...')
  
  const keyTables = ['tenants', 'members', 'products', 'waste_types', 'waste_collections']
  
  for (const table of keyTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`✅ ${table} (${count || 0} records)`)
      } else {
        console.log(`❌ ${table}: ${error.message}`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }
}

if (require.main === module) {
  applyMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}

module.exports = { applyMigrations }