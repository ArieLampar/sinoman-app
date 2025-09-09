const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTenants() {
  console.log('🏢 Checking Tenants Table Structure...')
  console.log('====================================')

  // Get all tenants
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
  
  if (error) {
    console.log('❌ Error fetching tenants:', error.message)
    return
  }

  console.log('📊 Tenants found:')
  tenants.forEach((tenant, index) => {
    console.log(`\n${index + 1}. Tenant ID: ${tenant.id}`)
    Object.keys(tenant).forEach(key => {
      if (key !== 'id') {
        console.log(`   ${key}: ${tenant[key]}`)
      }
    })
  })

  // Use first tenant for testing if available
  if (tenants.length > 0) {
    const testTenant = tenants[0].id
    console.log(`\n🧪 Testing with tenant ID: ${testTenant}`)
    
    // Test product query with valid UUID
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', testTenant)
      .limit(5)
    
    if (productError) {
      console.log(`❌ Products query error: ${productError.message}`)
    } else {
      console.log(`✅ Products query success: ${products.length} products found`)
    }

    // Test waste types query
    const { data: wasteTypes, error: wasteError } = await supabase
      .from('waste_types')
      .select('*')
      .eq('tenant_id', testTenant)
      .limit(5)
    
    if (wasteError) {
      console.log(`❌ Waste types query error: ${wasteError.message}`)
    } else {
      console.log(`✅ Waste types query success: ${wasteTypes.length} waste types found`)
    }
  }
}

if (require.main === module) {
  checkTenants().catch(console.error)
}

module.exports = { checkTenants }