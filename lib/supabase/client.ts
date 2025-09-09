// lib/supabase/client.ts
// Konfigurasi Supabase client untuk browser/client-side operations
// Digunakan untuk operasi yang membutuhkan auth user dan real-time features

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// Membuat client Supabase untuk browser
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Instance global untuk digunakan di komponen client
export const supabase = createClient()

// Helper functions untuk operasi umum dengan error handling

/**
 * Helper untuk mendapatkan user yang sedang login
 * @returns User object atau null jika tidak login
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting current user:', error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unexpected error getting user:', error)
    return null
  }
}

/**
 * Helper untuk mendapatkan session yang aktif
 * @returns Session object atau null jika tidak ada session
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error.message)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Unexpected error getting session:', error)
    return null
  }
}

/**
 * Helper untuk login dengan email dan password
 * @param email Email user
 * @param password Password user
 * @returns Success status dan error jika ada
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, error: null, data }
  } catch (error) {
    return { 
      success: false, 
      error: 'Terjadi kesalahan saat login', 
      data: null 
    }
  }
}

/**
 * Helper untuk logout
 * @returns Success status dan error jika ada
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: 'Terjadi kesalahan saat logout' }
  }
}

/**
 * Helper untuk mendapatkan data member berdasarkan user ID
 * @param userId UUID user dari auth
 * @returns Member data atau null jika tidak ditemukan
 */
export const getMemberByUserId = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        tenant:tenants(tenant_name, tenant_code),
        savings_account:savings_accounts(
          account_number,
          pokok_balance,
          wajib_balance,
          sukarela_balance,
          total_balance
        )
      `)
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting member:', error.message)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Unexpected error getting member:', error)
    return null
  }
}

/**
 * Helper untuk mendapatkan waste balance member
 * @param memberId UUID member
 * @returns Waste balance data atau null jika tidak ditemukan
 */
export const getWasteBalance = async (memberId: string) => {
  try {
    const { data, error } = await supabase
      .from('waste_balances')
      .select('*')
      .eq('member_id', memberId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting waste balance:', error.message)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Unexpected error getting waste balance:', error)
    return null
  }
}

/**
 * Helper untuk mendapatkan notifikasi user yang belum dibaca
 * @param userId UUID user
 * @param limit Jumlah notifikasi yang diambil (default 10)
 * @returns Array notifikasi atau array kosong jika error
 */
export const getUnreadNotifications = async (userId: string, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error getting notifications:', error.message)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Unexpected error getting notifications:', error)
    return []
  }
}

/**
 * Helper untuk mark notification sebagai sudah dibaca
 * @param notificationId UUID notification
 * @returns Success status
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error marking notification as read:', error.message)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Unexpected error marking notification as read:', error)
    return false
  }
}

/**
 * Helper untuk subscribe ke perubahan notifikasi real-time
 * @param userId UUID user
 * @param callback Function yang akan dipanggil saat ada update
 * @returns Subscription object untuk unsubscribe
 */
export const subscribeToNotifications = (
  userId: string, 
  callback: (payload: Record<string, unknown>) => void
) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

/**
 * Helper untuk subscribe ke perubahan saldo savings real-time
 * @param memberId UUID member
 * @param callback Function yang akan dipanggil saat ada update
 * @returns Subscription object untuk unsubscribe
 */
export const subscribeToSavingsBalance = (
  memberId: string, 
  callback: (payload: Record<string, unknown>) => void
) => {
  return supabase
    .channel(`savings_accounts:${memberId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'savings_accounts',
        filter: `member_id=eq.${memberId}`,
      },
      callback
    )
    .subscribe()
}

// Export default client untuk compatibility
export default supabase