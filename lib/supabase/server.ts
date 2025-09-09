// lib/supabase/server.ts
// Konfigurasi Supabase client untuk server-side operations
// Digunakan di Server Components, Route Handlers, dan Server Actions

import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

// Membuat Supabase client untuk server-side
export async function createServerClient() {
  const cookieStore = await cookies()
  
  return createSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Cookie can only be modified in Server Actions or Route Handlers
          }
        },
      },
    }
  )
}

// Helper functions untuk server-side operations

/**
 * Helper untuk mendapatkan user yang sedang login di server
 * @returns User object atau null jika tidak login
 */
export const getServerUser = async () => {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting server user:', error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unexpected error getting server user:', error)
    return null
  }
}

/**
 * Helper untuk mendapatkan session di server
 * @returns Session object atau null jika tidak ada session
 */
export const getServerSession = async () => {
  try {
    const supabase = await createServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting server session:', error.message)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Unexpected error getting server session:', error)
    return null
  }
}

/**
 * Helper untuk mendapatkan member data dengan join di server
 * @param userId UUID user dari auth
 * @returns Complete member data atau null jika tidak ditemukan
 */
export const getServerMemberData = async (userId: string) => {
  try {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        tenant:tenants(
          tenant_name,
          tenant_code,
          tenant_type,
          address,
          phone,
          email
        ),
        savings_account:savings_accounts(
          account_number,
          pokok_balance,
          wajib_balance,
          sukarela_balance,
          total_balance,
          last_transaction_date
        ),
        waste_balance:waste_balances(
          current_balance,
          total_weight_collected_kg,
          total_earnings,
          updated_at
        )
      `)
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting server member data:', error.message)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Unexpected error getting server member data:', error)
    return null
  }
}

/**
 * Helper untuk validasi apakah user adalah admin
 * @param userId UUID user
 * @returns Boolean apakah user adalah admin (currently returns false as role not in members table)
 */
export const isUserAdmin = async (userId: string) => {
  try {
    // TODO: Implement admin check when admin_users table is used
    // For now, check if user exists in members table
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('members')
      .select('status')
      .eq('id', userId)
      .single()
    
    if (error || !data) {
      return false
    }
    
    // For now, all active members are considered non-admin
    // This should be updated when admin system is implemented
    return false
  } catch (error) {
    console.error('Unexpected error checking admin status:', error)
    return false
  }
}

/**
 * Helper untuk mendapatkan semua transaksi member
 * @param memberId UUID member
 * @param limit Jumlah transaksi yang diambil (default 50)
 * @param offset Offset untuk pagination (default 0)
 * @returns Array transaksi atau array kosong jika error
 */
export const getMemberTransactions = async (
  memberId: string,
  limit = 50,
  offset = 0
) => {
  try {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('savings_transactions')
      .select(`
        *,
        verified_by:members!savings_transactions_verified_by_fkey(
          full_name,
          member_number
        )
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error getting member transactions:', error.message)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Unexpected error getting member transactions:', error)
    return []
  }
}