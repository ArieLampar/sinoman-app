const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function applyBankSampahMigration() {
  console.log('🗄️  Applying Bank Sampah Database Migration')
  console.log('==========================================')
  console.log(`📡 Connecting to: ${supabaseUrl}`)
  
  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '002_bank_sampah_tables.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Loaded migration: ${migrationSQL.length} characters`)

  // Check if tables already exist
  console.log('\n🔍 Checking existing tables...')
  const existingTables = await checkExistingTables()
  
  if (existingTables.length > 0) {
    console.log('⚠️  Some Bank Sampah tables already exist:')
    existingTables.forEach(table => console.log(`   - ${table}`))
    console.log('   Proceeding with CREATE IF NOT EXISTS...')
  }

  // Split migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

  console.log(`\n🔨 Executing ${statements.length} SQL statements...`)

  let successCount = 0
  let warningCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    
    try {
      // Most statements will fail with permission errors, but let's try anyway
      const { data, error } = await supabase.rpc('exec', { sql: statement })
      
      if (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('permission denied') ||
            error.message.includes('function exec(sql) does not exist')) {
          console.log(`   ${i + 1}. ⚠️  ${error.message.substring(0, 60)}...`)
          warningCount++
        } else {
          console.log(`   ${i + 1}. ❌ ${error.message.substring(0, 80)}...`)
        }
      } else {
        console.log(`   ${i + 1}. ✅ Success`)
        successCount++
      }
    } catch (err) {
      console.log(`   ${i + 1}. ⚠️  ${err.message.substring(0, 60)}...`)
      warningCount++
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📊 Execution Summary:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ⚠️  Warnings: ${warningCount}`)
  console.log(`   ❌ Failed: ${statements.length - successCount - warningCount}`)

  // Verify results
  console.log('\n🔍 Verifying migration results...')
  await verifyMigration()
}

async function checkExistingTables() {
  const bankSampahTables = [
    'waste_types', 'waste_collection_points', 'waste_collections',
    'waste_collection_items', 'waste_bank_accounts', 'waste_bank_transactions',
    'maggot_batches', 'maggot_batch_inputs', 'maggot_harvests'
  ]

  const existingTables = []

  for (const table of bankSampahTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (!error) {
        existingTables.push(table)
      }
    } catch (err) {
      // Table doesn't exist, which is expected
    }
  }

  return existingTables
}

async function verifyMigration() {
  const requiredTables = [
    'waste_types', 'waste_collections', 'maggot_batches',
    'waste_bank_accounts', 'waste_collection_items'
  ]

  let verifiedCount = 0

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`   ✅ ${table} - accessible`)
        verifiedCount++
      } else {
        console.log(`   ❌ ${table} - ${error.message}`)
      }
    } catch (err) {
      console.log(`   ❌ ${table} - ${err.message}`)
    }
  }

  console.log(`\n🎯 Migration Verification:`)
  console.log(`   Tables accessible: ${verifiedCount}/${requiredTables.length}`)
  
  if (verifiedCount === requiredTables.length) {
    console.log('   🎉 Migration appears successful!')
    
    // Test API endpoints
    console.log('\n🧪 Testing API endpoints...')
    await testAPIEndpoints()
  } else if (verifiedCount > 0) {
    console.log('   ⚠️  Partial migration - some tables missing')
    console.log('   💡 Try running the migration via Supabase Dashboard SQL Editor')
  } else {
    console.log('   ❌ Migration failed - no tables accessible')
    console.log('   💡 Manual migration required via Supabase Dashboard')
  }

  console.log('\n📖 Next Steps:')
  console.log('   1. Check Supabase Dashboard > SQL Editor for any errors')
  console.log('   2. Manually run migration SQL if needed')
  console.log('   3. Add sample waste types data')
  console.log('   4. Test frontend interfaces at:')
  console.log('      - http://localhost:3001/admin/waste')
  console.log('      - http://localhost:3001/deposit')
  console.log('      - http://localhost:3001/maggot')
}

async function testAPIEndpoints() {
  const testEndpoints = [
    '/api/waste-types?tenant_id=4aa453df-34c3-48e6-93c8-e6aafcd71cc7',
    '/api/waste-collections?tenant_id=4aa453df-34c3-48e6-93c8-e6aafcd71cc7',
    '/api/maggot-batches?tenant_id=4aa453df-34c3-48e6-93c8-e6aafcd71cc7'
  ]

  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(`http://localhost:3001${endpoint}`)
      const status = response.status
      
      if (status === 200) {
        console.log(`   ✅ ${endpoint.split('?')[0]} - Working`)
      } else {
        console.log(`   ⚠️  ${endpoint.split('?')[0]} - Status ${status}`)
      }
    } catch (err) {
      console.log(`   ❌ ${endpoint.split('?')[0]} - Connection failed`)
    }
  }
}

if (require.main === module) {
  applyBankSampahMigration()
    .then(() => {
      console.log('\n✨ Bank Sampah migration process completed!')
      console.log('📄 See MIGRATION-GUIDE.md for manual steps if needed')
    })
    .catch(err => {
      console.error('\n💥 Migration failed:', err.message)
      console.log('📄 Check MIGRATION-GUIDE.md for troubleshooting')
      process.exit(1)
    })
}

module.exports = { applyBankSampahMigration }