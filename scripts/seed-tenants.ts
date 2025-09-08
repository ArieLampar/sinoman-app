import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('====================================')
console.log('Seeding Sample Tenants')
console.log('====================================\n')

const sampleTenants = [
  {
    tenant_code: 'KOP001',
    tenant_name: 'Koperasi Sinoman Pusat',
    tenant_type: 'pusat',
    address: 'Jl. Merdeka No. 123, Jakarta Pusat',
    phone: '021-12345678',
    email: 'info@sinomanpusat.co.id',
    is_active: true,
    settings: {
      allow_registration: true,
      require_approval: false,
      savings_types: ['pokok', 'wajib', 'sukarela']
    }
  },
  {
    tenant_code: 'KEC001', 
    tenant_name: 'Koperasi Kecamatan Cibinong',
    tenant_type: 'kecamatan',
    address: 'Jl. Raya Cibinong No. 45, Bogor',
    phone: '021-87654321',
    email: 'info@kopcibinong.co.id',
    is_active: true,
    settings: {
      allow_registration: true,
      require_approval: true,
      savings_types: ['pokok', 'wajib', 'sukarela']
    }
  },
  {
    tenant_code: 'DESA001',
    tenant_name: 'Koperasi Desa Sukamaju',
    tenant_type: 'desa',
    address: 'Jl. Desa Sukamaju RT 01/02, Bogor',
    phone: '021-11223344',
    email: 'info@kopsukamaju.co.id',
    is_active: true,
    settings: {
      allow_registration: true,
      require_approval: false,
      savings_types: ['pokok', 'wajib']
    }
  }
]

async function seedTenants() {
  try {
    console.log('🌱 Inserting sample tenants...\n')
    
    for (const tenant of sampleTenants) {
      // Check if tenant already exists
      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('tenant_code', tenant.tenant_code)
        .single()
      
      if (existing) {
        console.log(`   ⚠️  ${tenant.tenant_name} (${tenant.tenant_code}) already exists`)
        continue
      }
      
      // Insert new tenant
      const { data, error } = await supabase
        .from('tenants')
        .insert(tenant)
        .select()
        .single()
      
      if (error) {
        console.error(`   ❌ Error inserting ${tenant.tenant_name}:`, error.message)
      } else {
        console.log(`   ✅ ${tenant.tenant_name} (${tenant.tenant_code}) created`)
        console.log(`      ID: ${data.id}`)
      }
    }
    
    console.log('\n====================================')
    console.log('Seeding Complete!')
    console.log('====================================')
    console.log('\n📋 Available Tenants for Registration:')
    
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('tenant_code, tenant_name, tenant_type')
      .eq('is_active', true)
      .order('tenant_name')
    
    if (allTenants) {
      allTenants.forEach(tenant => {
        console.log(`   • ${tenant.tenant_name} (${tenant.tenant_code}) - ${tenant.tenant_type}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

seedTenants()