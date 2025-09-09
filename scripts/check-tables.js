const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTables() {
  console.log('🔍 Checking Database Tables...')
  console.log('===============================')

  // Test basic table access
  const tables = [
    'tenants', 'members', 'products', 'waste_types', 
    'waste_collections', 'maggot_batches', 'orders'
  ]

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: Table exists (${count || 0} records)`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }

  console.log('\n🧪 Testing specific API queries...')
  
  // Test queries that the APIs would make
  try {
    console.log('\n1. Products query (no tenant filter):')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ ${error.message}`)
    } else {
      console.log(`   ✅ Success: ${data?.length || 0} products`)
    }
  } catch (err) {
    console.log(`   ❌ ${err.message}`)
  }

  try {
    console.log('\n2. Products query with tenant filter:')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', 'demo-tenant')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ ${error.message}`)
    } else {
      console.log(`   ✅ Success: ${data?.length || 0} products for demo-tenant`)
    }
  } catch (err) {
    console.log(`   ❌ ${err.message}`)
  }

  try {
    console.log('\n3. Check if tenants table has demo-tenant:')
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', 'demo-tenant')
    
    if (error) {
      console.log(`   ❌ ${error.message}`)
    } else {
      console.log(`   ✅ Found tenants: ${JSON.stringify(data, null, 2)}`)
    }
  } catch (err) {
    console.log(`   ❌ ${err.message}`)
  }
}

if (require.main === module) {
  checkTables().catch(console.error)
}

module.exports = { checkTables }