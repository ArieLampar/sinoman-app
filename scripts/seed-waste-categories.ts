// Script to seed waste categories data
// Run with: npx tsx scripts/seed-waste-categories.ts

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const wasteCategories = [
  // Plastic categories
  {
    category_code: 'PLS-PET',
    category_name: 'Plastik',
    sub_category: 'Botol PET',
    buying_price_per_kg: 3000,
    selling_price_per_kg: 4000,
    minimum_weight_kg: 0.5,
    is_active: true
  },
  {
    category_code: 'PLS-HDPE',
    category_name: 'Plastik',
    sub_category: 'Botol HDPE (Susu, Shampo)',
    buying_price_per_kg: 2500,
    selling_price_per_kg: 3500,
    minimum_weight_kg: 0.3,
    is_active: true
  },
  {
    category_code: 'PLS-PP',
    category_name: 'Plastik',
    sub_category: 'Plastik PP (Gelas, Ember)',
    buying_price_per_kg: 2000,
    selling_price_per_kg: 3000,
    minimum_weight_kg: 0.5,
    is_active: true
  },
  {
    category_code: 'PLS-LDPE',
    category_name: 'Plastik',
    sub_category: 'Kantong Plastik LDPE',
    buying_price_per_kg: 1800,
    selling_price_per_kg: 2800,
    minimum_weight_kg: 0.2,
    is_active: true
  },
  
  // Paper categories
  {
    category_code: 'KRT-PUTIH',
    category_name: 'Kertas',
    sub_category: 'Kertas Putih/HVS',
    buying_price_per_kg: 2200,
    selling_price_per_kg: 3200,
    minimum_weight_kg: 1.0,
    is_active: true
  },
  {
    category_code: 'KRT-KORAN',
    category_name: 'Kertas',
    sub_category: 'Kertas Koran',
    buying_price_per_kg: 1800,
    selling_price_per_kg: 2800,
    minimum_weight_kg: 1.0,
    is_active: true
  },
  {
    category_code: 'KRT-MAJALAH',
    category_name: 'Kertas',
    sub_category: 'Kertas Majalah',
    buying_price_per_kg: 1500,
    selling_price_per_kg: 2500,
    minimum_weight_kg: 1.0,
    is_active: true
  },
  {
    category_code: 'KRT-KARDUS',
    category_name: 'Kertas',
    sub_category: 'Kardus/Karton',
    buying_price_per_kg: 2000,
    selling_price_per_kg: 3000,
    minimum_weight_kg: 0.5,
    is_active: true
  },
  
  // Metal categories
  {
    category_code: 'LGM-BESI',
    category_name: 'Logam',
    sub_category: 'Besi Tua',
    buying_price_per_kg: 4000,
    selling_price_per_kg: 5500,
    minimum_weight_kg: 1.0,
    is_active: true
  },
  {
    category_code: 'LGM-ALUMINIUM',
    category_name: 'Logam',
    sub_category: 'Aluminium (Kaleng, Profil)',
    buying_price_per_kg: 8000,
    selling_price_per_kg: 10000,
    minimum_weight_kg: 0.3,
    is_active: true
  },
  {
    category_code: 'LGM-TEMBAGA',
    category_name: 'Logam',
    sub_category: 'Tembaga/Kuningan',
    buying_price_per_kg: 35000,
    selling_price_per_kg: 40000,
    minimum_weight_kg: 0.2,
    is_active: true
  },
  
  // Glass categories
  {
    category_code: 'KCA-BENING',
    category_name: 'Kaca',
    sub_category: 'Botol Kaca Bening',
    buying_price_per_kg: 1200,
    selling_price_per_kg: 2200,
    minimum_weight_kg: 1.0,
    is_active: true
  },
  {
    category_code: 'KCA-WARNA',
    category_name: 'Kaca',
    sub_category: 'Botol Kaca Berwarna',
    buying_price_per_kg: 800,
    selling_price_per_kg: 1800,
    minimum_weight_kg: 1.0,
    is_active: true
  },
  
  // Electronic waste
  {
    category_code: 'ELK-HP',
    category_name: 'Elektronik',
    sub_category: 'Handphone Bekas',
    buying_price_per_kg: 15000,
    selling_price_per_kg: 25000,
    minimum_weight_kg: 0.1,
    is_active: true
  },
  {
    category_code: 'ELK-KABEL',
    category_name: 'Elektronik',
    sub_category: 'Kabel Tembaga',
    buying_price_per_kg: 25000,
    selling_price_per_kg: 32000,
    minimum_weight_kg: 0.2,
    is_active: true
  },
  
  // Mixed/Other categories
  {
    category_code: 'CPR-BUKU',
    category_name: 'Campuran',
    sub_category: 'Buku Tulis/Novel',
    buying_price_per_kg: 1000,
    selling_price_per_kg: 2000,
    minimum_weight_kg: 2.0,
    is_active: true
  },
  {
    category_code: 'CPR-DUPLEX',
    category_name: 'Campuran',
    sub_category: 'Kertas Duplex',
    buying_price_per_kg: 800,
    selling_price_per_kg: 1800,
    minimum_weight_kg: 1.0,
    is_active: true
  }
]

async function seedWasteCategories() {
  console.log('🌱 Starting waste categories seeding...')
  
  try {
    // Clear existing categories (optional)
    console.log('🧹 Clearing existing waste categories...')
    const { error: deleteError } = await supabase
      .from('waste_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log('⚠️ Note: Error clearing existing data (table might be empty):', deleteError.message)
    }

    // Insert new categories
    console.log('📝 Inserting waste categories...')
    const { data, error } = await supabase
      .from('waste_categories')
      .insert(wasteCategories.map(category => ({
        ...category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })))
      .select()

    if (error) {
      console.error('❌ Error inserting waste categories:', error)
      return
    }

    console.log(`✅ Successfully inserted ${data?.length || 0} waste categories`)

    // Display summary
    console.log('\n📊 Categories Summary:')
    const groupedByCategory = wasteCategories.reduce((acc, item) => {
      if (!acc[item.category_name]) {
        acc[item.category_name] = []
      }
      acc[item.category_name].push(item)
      return acc
    }, {} as Record<string, typeof wasteCategories>)

    Object.entries(groupedByCategory).forEach(([category, items]) => {
      console.log(`  ${category}: ${items.length} sub-categories`)
      const avgPrice = items.reduce((sum, item) => sum + item.buying_price_per_kg, 0) / items.length
      const priceRange = {
        min: Math.min(...items.map(item => item.buying_price_per_kg)),
        max: Math.max(...items.map(item => item.buying_price_per_kg))
      }
      console.log(`    Price range: Rp ${priceRange.min.toLocaleString()} - Rp ${priceRange.max.toLocaleString()} (avg: Rp ${Math.round(avgPrice).toLocaleString()})`)
    })

    console.log('\n🎉 Waste categories seeding completed successfully!')

  } catch (error) {
    console.error('❌ Unexpected error during seeding:', error)
  }
}

// Run the seeding
if (require.main === module) {
  seedWasteCategories()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}

export default seedWasteCategories