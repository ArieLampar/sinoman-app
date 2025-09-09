// Script to fix Supabase import issues in E-Commerce API files
const fs = require('fs')
const path = require('path')

const filesToFix = [
  'app/api/products/[id]/route.ts',
  'app/api/products/categories/route.ts', 
  'app/api/products/featured/route.ts',
  'app/api/products/search/route.ts',
  'app/api/products/reviews/route.ts',
  'app/api/cart/route.ts',
  'app/api/cart/[itemId]/route.ts',
  'app/api/orders/route.ts',
  'app/api/orders/[id]/route.ts',
  'app/api/orders/[id]/payment/route.ts',
  'app/api/pricing/route.ts',
  'app/api/coupons/route.ts',
  'app/api/inventory/route.ts',
  'app/api/inventory/alerts/route.ts',
  'app/api/inventory/reports/route.ts',
  'app/api/deliveries/route.ts',
  'app/api/deliveries/[id]/route.ts',
  'app/api/deliveries/track/[trackingNumber]/route.ts',
  'app/api/delivery-drivers/route.ts',
  'app/api/admin/products/route.ts',
  'app/api/admin/products/analytics/route.ts',
  'app/api/admin/orders/route.ts'
]

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      return false
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Fix the import statement
    if (content.includes("import { createServerSupabaseClient } from '@/lib/supabase/server'")) {
      content = content.replace(
        "import { createServerSupabaseClient } from '@/lib/supabase/server'",
        "import { createServerClient } from '@/lib/supabase/server'"
      )
      modified = true
    }

    // Fix all function calls
    const oldPattern = /const supabase = createServerSupabaseClient\(\)/g
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, 'const supabase = await createServerClient()')
      modified = true
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Fixed: ${filePath}`)
      return true
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message)
    return false
  }
}

console.log('🔧 Fixing Supabase imports in E-Commerce API files...')
console.log('========================================')

let fixedCount = 0
let totalFiles = filesToFix.length

for (const file of filesToFix) {
  const fullPath = path.join(process.cwd(), file)
  if (fixFile(fullPath)) {
    fixedCount++
  }
}

console.log('========================================')
console.log(`📊 Results: ${fixedCount}/${totalFiles} files fixed`)
console.log('✨ All E-Commerce API imports have been updated!')