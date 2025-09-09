const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const DEMO_TENANT_ID = '4aa453df-34c3-48e6-93c8-e6aafcd71cc7' // Koperasi Sinoman Ponorogo Kota

async function seedWasteData() {
  console.log('🌱 Seeding Bank Sampah Sample Data')
  console.log('==================================')
  
  try {
    // 1. Seed Waste Types
    console.log('\n📦 Creating waste types...')
    const wasteTypesData = [
      {
        tenant_id: DEMO_TENANT_ID,
        name: 'Plastik Botol',
        category: 'plastic',
        subcategory: 'PET',
        description: 'Botol plastik minuman bekas',
        unit: 'kg',
        price_per_unit: 3000.00,
        is_organic: false,
        suitable_for_maggot: false,
        processing_method: 'recycling',
        environmental_impact_score: 7
      },
      {
        tenant_id: DEMO_TENANT_ID,
        name: 'Kardus',
        category: 'paper',
        subcategory: 'corrugated',
        description: 'Kardus dan karton bekas',
        unit: 'kg',
        price_per_unit: 3000.00,
        is_organic: false,
        suitable_for_maggot: false,
        processing_method: 'recycling',
        environmental_impact_score: 8
      },
      {
        tenant_id: DEMO_TENANT_ID,
        name: 'Kaleng Aluminium',
        category: 'metal',
        subcategory: 'aluminum',
        description: 'Kaleng minuman aluminium',
        unit: 'kg',
        price_per_unit: 7000.00,
        is_organic: false,
        suitable_for_maggot: false,
        processing_method: 'recycling',
        environmental_impact_score: 9
      },
      {
        tenant_id: DEMO_TENANT_ID,
        name: 'Sampah Dapur',
        category: 'organic',
        subcategory: 'food_waste',
        description: 'Sisa makanan dan sampah dapur',
        unit: 'kg',
        price_per_unit: 1500.00,
        is_organic: true,
        suitable_for_maggot: true,
        processing_method: 'maggot_farming',
        environmental_impact_score: 6
      },
      {
        tenant_id: DEMO_TENANT_ID,
        name: 'Sisa Sayuran',
        category: 'organic',
        subcategory: 'vegetable',
        description: 'Sisa sayuran dan buah-buahan',
        unit: 'kg',
        price_per_unit: 1200.00,
        is_organic: true,
        suitable_for_maggot: true,
        processing_method: 'maggot_farming',
        environmental_impact_score: 6
      }
    ]

    // Check if waste types already exist
    const { data: existingTypes } = await supabase
      .from('waste_types')
      .select('id, name')
      .eq('tenant_id', DEMO_TENANT_ID)

    if (existingTypes && existingTypes.length > 0) {
      console.log(`   ⚠️  ${existingTypes.length} waste types already exist, skipping...`)
    } else {
      const { data: createdTypes, error: typesError } = await supabase
        .from('waste_types')
        .insert(wasteTypesData)
        .select('id, name')

      if (typesError) {
        console.log(`   ❌ Error creating waste types: ${typesError.message}`)
      } else {
        console.log(`   ✅ Created ${createdTypes?.length || 0} waste types`)
      }
    }

    // 2. Create a collection point if needed
    console.log('\n🏪 Creating collection point...')
    const { data: existingPoints } = await supabase
      .from('waste_collection_points')
      .select('id, name')
      .eq('tenant_id', DEMO_TENANT_ID)

    if (existingPoints && existingPoints.length > 0) {
      console.log(`   ⚠️  ${existingPoints.length} collection points already exist, skipping...`)
    } else {
      // Get a member to be the manager
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('tenant_id', DEMO_TENANT_ID)
        .limit(1)

      const managerId = members?.[0]?.id

      const collectionPointData = {
        tenant_id: DEMO_TENANT_ID,
        name: 'Pos Utama',
        code: 'POS-001',
        address: 'Jl. Merdeka No. 123, Ponorogo',
        manager_id: managerId,
        status: 'active',
        capacity_kg: 1000.00,
        current_load_kg: 0.00,
        operating_hours: {
          monday: '08:00-17:00',
          tuesday: '08:00-17:00',
          wednesday: '08:00-17:00',
          thursday: '08:00-17:00',
          friday: '08:00-17:00',
          saturday: '08:00-12:00',
          sunday: 'closed'
        },
        contact_phone: '021-12345678',
        facilities: ['scale', 'sorting_area', 'storage']
      }

      const { data: createdPoint, error: pointError } = await supabase
        .from('waste_collection_points')
        .insert(collectionPointData)
        .select('id, name')
        .single()

      if (pointError) {
        console.log(`   ❌ Error creating collection point: ${pointError.message}`)
      } else {
        console.log(`   ✅ Created collection point: ${createdPoint?.name}`)
      }
    }

    // 3. Create waste bank accounts for members
    console.log('\n💰 Creating waste bank accounts...')
    const { data: members } = await supabase
      .from('members')
      .select('id, full_name')
      .eq('tenant_id', DEMO_TENANT_ID)

    if (members && members.length > 0) {
      for (const member of members) {
        // Check if account already exists
        const { data: existingAccount } = await supabase
          .from('waste_bank_accounts')
          .select('id')
          .eq('member_id', member.id)
          .single()

        if (!existingAccount) {
          const accountData = {
            tenant_id: DEMO_TENANT_ID,
            member_id: member.id,
            account_number: `WB${Date.now()}${member.id.substring(0, 4)}`,
            current_balance: 0.00,
            total_earned: 0.00,
            total_withdrawn: 0.00,
            total_waste_kg: 0.00,
            is_active: true
          }

          const { error: accountError } = await supabase
            .from('waste_bank_accounts')
            .insert(accountData)

          if (accountError) {
            console.log(`   ⚠️  Error creating account for ${member.full_name}: ${accountError.message}`)
          } else {
            console.log(`   ✅ Created account for: ${member.full_name}`)
          }
        } else {
          console.log(`   ⚠️  Account already exists for: ${member.full_name}`)
        }
      }
    }

    // 4. Test API endpoints
    console.log('\n🧪 Testing API endpoints...')
    const testEndpoints = [
      '/api/waste-types',
      '/api/waste-collections',
      '/api/maggot-batches'
    ]

    for (const endpoint of testEndpoints) {
      try {
        const url = `http://localhost:3001${endpoint}?tenant_id=${DEMO_TENANT_ID}`
        const response = await fetch(url)
        const status = response.status
        
        if (status === 200) {
          const data = await response.json()
          console.log(`   ✅ ${endpoint} - Working (${data.data?.length || 0} items)`)
        } else {
          console.log(`   ⚠️  ${endpoint} - Status ${status}`)
        }
      } catch (err) {
        console.log(`   ❌ ${endpoint} - Connection failed: ${err.message}`)
      }
    }

    console.log('\n🎉 Sample data seeding completed!')
    console.log('\n🌐 Test the interfaces:')
    console.log('   Admin Dashboard: http://localhost:3001/admin/waste')
    console.log('   Deposit Interface: http://localhost:3001/deposit')
    console.log('   Maggot Farming: http://localhost:3001/maggot')
    console.log('   Waste Bank: http://localhost:3001/waste-bank')

  } catch (error) {
    console.error('💥 Seeding failed:', error.message)
  }
}

if (require.main === module) {
  seedWasteData().catch(console.error)
}

module.exports = { seedWasteData }