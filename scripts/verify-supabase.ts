import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('====================================')
console.log('Verifikasi Koneksi Supabase')
console.log('====================================\n')

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Environment variables tidak ditemukan!')
  console.log('Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diset di .env.local')
  process.exit(1)
}

console.log('✅ Environment variables ditemukan:')
console.log(`   URL: ${supabaseUrl}`)
console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...\n`)

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyConnection() {
  try {
    console.log('🔄 Testing koneksi ke Supabase...\n')
    
    // Test 1: Check if we can connect to the database
    console.log('Test 1: Cek koneksi database')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('count')
      .limit(1)
    
    if (tenantsError) {
      console.error('❌ Error mengakses tabel tenants:', tenantsError.message)
    } else {
      console.log('✅ Berhasil terhubung ke tabel tenants')
    }
    
    // Test 2: Check auth configuration
    console.log('\nTest 2: Cek konfigurasi auth')
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('❌ Error dengan auth:', authError.message)
    } else {
      console.log('✅ Auth configured properly')
      console.log(`   Session status: ${session ? 'Active' : 'No active session'}`)
    }
    
    // Test 3: Check if tables exist
    console.log('\nTest 3: Cek tabel-tabel utama')
    const tables = [
      'tenants',
      'members', 
      'savings_accounts', 
      'savings_transactions',
      'products',
      'product_categories',
      'orders',
      'waste_categories',
      'waste_deposits',
      'waste_balances',
      'fit_challenges',
      'notifications'
    ]
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ Tabel ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ Tabel ${table}: OK`)
      }
    }
    
    // Test 4: Check RLS policies
    console.log('\nTest 4: Cek Row Level Security (RLS)')
    console.log('   ℹ️  RLS melindungi data Anda. Jika enabled, query tanpa auth akan dibatasi.')
    
    console.log('\n====================================')
    console.log('Verifikasi Selesai!')
    console.log('====================================')
    console.log('\n📝 Rekomendasi:')
    console.log('1. Pastikan semua tabel yang diperlukan sudah dibuat di Supabase')
    console.log('2. Setup RLS policies untuk keamanan data')
    console.log('3. Tambahkan SUPABASE_SERVICE_ROLE_KEY di .env.local untuk operasi admin')
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

verifyConnection()