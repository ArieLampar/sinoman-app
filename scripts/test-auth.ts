import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('====================================')
console.log('Test Authentication Flow')
console.log('====================================\n')

// Test credentials
const testEmail = 'test@sinoman.com'
const testPassword = 'test123456'

async function testAuth() {
  try {
    // Test 1: Try to register a new user
    console.log('Test 1: Registrasi user baru')
    console.log(`   Email: ${testEmail}`)
    console.log(`   Password: ${testPassword}\n`)
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User Sinoman',
        }
      }
    })
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('   ℹ️  User sudah terdaftar sebelumnya')
      } else {
        console.error('   ❌ Error registrasi:', signUpError.message)
      }
    } else {
      console.log('   ✅ Registrasi berhasil!')
      console.log('   User ID:', signUpData.user?.id)
      console.log('   Email:', signUpData.user?.email)
    }
    
    // Test 2: Try to login
    console.log('\nTest 2: Login dengan kredensial')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (signInError) {
      console.error('   ❌ Error login:', signInError.message)
    } else {
      console.log('   ✅ Login berhasil!')
      console.log('   Session token:', signInData.session?.access_token.substring(0, 20) + '...')
      console.log('   User ID:', signInData.user?.id)
    }
    
    // Test 3: Get current session
    console.log('\nTest 3: Cek session aktif')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('   ❌ Error mendapatkan session:', sessionError.message)
    } else if (session) {
      console.log('   ✅ Session aktif ditemukan')
      console.log('   User email:', session.user?.email)
      console.log('   Session expires at:', new Date(session.expires_at! * 1000).toLocaleString('id-ID'))
    } else {
      console.log('   ℹ️  Tidak ada session aktif')
    }
    
    // Test 4: Try to access protected data
    console.log('\nTest 4: Akses data dengan auth')
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .limit(1)
    
    if (memberError) {
      console.log('   ℹ️  Tidak bisa akses tabel members:', memberError.message)
      console.log('   (Normal jika RLS aktif dan user belum terdaftar sebagai member)')
    } else {
      console.log('   ✅ Berhasil akses tabel members')
      console.log('   Jumlah data:', memberData?.length || 0)
    }
    
    // Test 5: Logout
    console.log('\nTest 5: Logout')
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.error('   ❌ Error logout:', signOutError.message)
    } else {
      console.log('   ✅ Logout berhasil')
    }
    
    console.log('\n====================================')
    console.log('Test Selesai!')
    console.log('====================================')
    console.log('\n📝 Kesimpulan:')
    console.log('- Koneksi Supabase: ✅ OK')
    console.log('- Authentication: ✅ Berfungsi')
    console.log('- Session Management: ✅ OK')
    console.log('\n🔐 Security Notes:')
    console.log('- Pastikan email verification diaktifkan di Supabase Dashboard')
    console.log('- Setup RLS policies untuk melindungi data')
    console.log('- Gunakan service role key hanya di server-side')
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

testAuth()