import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedTenants() {
  console.log('Seeding tenants...')

  const tenants = [
    {
      tenant_code: 'KOPERASI-01',
      tenant_name: 'Koperasi Sinoman Utama',
      tenant_type: 'pusat',
      address: 'Jl. Merdeka No. 123, Jakarta Pusat',
      phone: '021-1234567',
      email: 'admin@sinoman-utama.id',
      is_active: true,
      settings: {
        registration_fee: 50000,
        monthly_fee: 25000
      }
    },
    {
      tenant_code: 'KOPERASI-02',
      tenant_name: 'Koperasi Sinoman Cabang Jakarta',
      tenant_type: 'kecamatan',
      address: 'Jl. Sudirman No. 456, Jakarta Selatan',
      phone: '021-7654321',
      email: 'admin@sinoman-jakarta.id',
      is_active: true,
      settings: {
        registration_fee: 50000,
        monthly_fee: 25000
      }
    },
    {
      tenant_code: 'KOPERASI-03',
      tenant_name: 'Koperasi Sinoman Desa Makmur',
      tenant_type: 'desa',
      address: 'Desa Makmur, Kec. Sukajaya, Kab. Bogor',
      phone: '0251-123456',
      email: 'admin@sinoman-makmur.id',
      is_active: true,
      settings: {
        registration_fee: 25000,
        monthly_fee: 15000
      }
    }
  ]

  try {
    const { data, error } = await supabase
      .from('tenants')
      .upsert(tenants, { onConflict: 'tenant_code' })
      .select()

    if (error) {
      console.error('Error seeding tenants:', error)
      return
    }

    console.log('Successfully seeded tenants:')
    data.forEach(tenant => {
      console.log(`- ${tenant.tenant_name} (${tenant.tenant_code})`)
    })

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

seedTenants()