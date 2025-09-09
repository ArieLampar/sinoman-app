const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkProductsSchema() {
  console.log('🔍 Checking Products Table Schema...')
  console.log('====================================')

  // Try to get one product to see actual column structure
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1)
  
  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('📊 Sample Product Object:')
    console.log(JSON.stringify(data[0], null, 2))
    
    console.log('\n🏷️  Available Columns:')
    Object.keys(data[0]).forEach(column => {
      console.log(`  - ${column}`)
    })
  } else {
    console.log('📊 No products found, but table exists')
    
    // Try to infer columns from error messages
    console.log('\n🏷️  Inferring schema from error messages...')
    
    // Test different column combinations
    const testQueries = [
      'id, category',
      'id, category_id', 
      'id, name, title',
      'id, description, product_name',
      'id, status, is_active',
      'id, featured, is_featured',
      'id, stock_quantity, stock',
      'id, member_price, price',
      'id, created_at'
    ]
    
    for (const columns of testQueries) {
      const { data: testData, error: testError } = await supabase
        .from('products')
        .select(columns)
        .limit(1)
      
      if (!testError) {
        console.log(`  ✅ Valid columns: ${columns}`)
      } else {
        console.log(`  ❌ Invalid: ${columns} - ${testError.message}`)
      }
    }
  }
}

if (require.main === module) {
  checkProductsSchema().catch(console.error)
}

module.exports = { checkProductsSchema }