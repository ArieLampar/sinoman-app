// lib/supabase/admin.ts
// Konfigurasi Supabase client untuk admin operations
// Menggunakan service role key untuk operasi yang membutuhkan akses penuh
// HANYA DIGUNAKAN DI SERVER-SIDE (API routes, server actions)

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Validasi environment variables untuk service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Environment variables untuk Supabase Admin tidak lengkap')
}

// Admin client dengan service role key
// PERINGATAN: Hanya gunakan di server-side operations!
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper functions untuk admin operations

/**
 * Helper untuk membuat member baru langsung dengan bypass auth
 * @param memberData Data member yang akan dibuat
 * @returns Member object yang sudah dibuat atau error
 */
export const createMember = async (memberData: {
  email: string
  password: string
  full_name: string
  tenant_id: string
  member_number?: string
  phone?: string
  address?: string
  role?: 'member' | 'pengurus' | 'admin'
}) => {
  try {
    // 1. Buat user di auth terlebih dahulu
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: memberData.email,
      password: memberData.password,
      email_confirm: true,
      user_metadata: {
        full_name: memberData.full_name
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError.message)
      return { data: null, error: authError }
    }

    // 2. Buat record member dengan user ID dari auth
    const { data: memberRecord, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        id: authData.user.id,
        email: memberData.email,
        full_name: memberData.full_name,
        tenant_id: memberData.tenant_id,
        member_number: memberData.member_number,
        phone: memberData.phone,
        address: memberData.address,
        role: memberData.role || 'member',
        status: 'active'
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error creating member record:', memberError.message)
      // Rollback: hapus user dari auth jika gagal buat member
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { data: null, error: memberError }
    }

    // 3. Buat savings account untuk member baru
    const { error: savingsError } = await supabaseAdmin
      .from('savings_accounts')
      .insert({
        member_id: memberRecord.id,
        tenant_id: memberData.tenant_id,
        account_number: `SAV-${memberData.member_number || memberRecord.id.slice(0, 8)}`,
        pokok_balance: 0,
        wajib_balance: 0,
        sukarela_balance: 0,
        total_balance: 0
      })

    if (savingsError) {
      console.error('Error creating savings account:', savingsError.message)
    }

    // 4. Buat waste balance untuk member baru
    const { error: wasteError } = await supabaseAdmin
      .from('waste_balances')
      .insert({
        member_id: memberRecord.id,
        tenant_id: memberData.tenant_id,
        organic_balance: 0,
        inorganic_balance: 0,
        total_balance: 0
      })

    if (wasteError) {
      console.error('Error creating waste balance:', wasteError.message)
    }

    return { data: memberRecord, error: null }
  } catch (error) {
    console.error('Unexpected error creating member:', error)
    return { data: null, error }
  }
}

/**
 * Helper untuk menghapus member dan semua data terkait
 * @param memberId UUID member yang akan dihapus
 * @returns Success status
 */
export const deleteMember = async (memberId: string) => {
  try {
    // 1. Hapus semua transaksi terkait
    await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('member_id', memberId)

    await supabaseAdmin
      .from('waste_transactions')
      .delete()
      .eq('member_id', memberId)

    // 2. Hapus savings account dan waste balance
    await supabaseAdmin
      .from('savings_accounts')
      .delete()
      .eq('member_id', memberId)

    await supabaseAdmin
      .from('waste_balances')
      .delete()
      .eq('member_id', memberId)

    // 3. Hapus notifikasi
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('recipient_id', memberId)

    // 4. Hapus member record
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', memberId)

    if (memberError) {
      console.error('Error deleting member:', memberError.message)
      return { success: false, error: memberError }
    }

    // 5. Hapus user dari auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(memberId)

    if (authError) {
      console.error('Error deleting auth user:', authError.message)
      return { success: false, error: authError }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error deleting member:', error)
    return { success: false, error }
  }
}

/**
 * Helper untuk update role member
 * @param memberId UUID member
 * @param newRole Role baru
 * @returns Success status
 */
export const updateMemberRole = async (
  memberId: string, 
  newRole: 'member' | 'pengurus' | 'admin' | 'super_admin'
) => {
  try {
    const { error } = await supabaseAdmin
      .from('members')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating member role:', error.message)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error updating member role:', error)
    return { success: false, error }
  }
}

/**
 * Helper untuk reset password member
 * @param memberId UUID member
 * @param newPassword Password baru
 * @returns Success status
 */
export const resetMemberPassword = async (memberId: string, newPassword: string) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(memberId, {
      password: newPassword
    })

    if (error) {
      console.error('Error resetting member password:', error.message)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error resetting password:', error)
    return { success: false, error }
  }
}

/**
 * Helper untuk mendapatkan semua member dengan detail lengkap
 * @param tenantId UUID tenant (opsional, untuk filter tenant)
 * @param limit Jumlah data yang diambil
 * @param offset Offset untuk pagination
 * @returns Array member dengan detail lengkap
 */
export const getAllMembersWithDetails = async (
  tenantId?: string,
  limit = 100,
  offset = 0
) => {
  try {
    let query = supabaseAdmin
      .from('members')
      .select(`
        *,
        tenant:tenants(
          tenant_name,
          tenant_code
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
          organic_balance,
          inorganic_balance,
          total_balance,
          last_updated
        )
      `)

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting all members:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error getting all members:', error)
    return []
  }
}

/**
 * Helper untuk membuat transaksi simpanan (admin only)
 * @param transactionData Data transaksi
 * @returns Transaction object yang sudah dibuat atau error
 */
export const createSavingsTransaction = async (transactionData: {
  member_id: string
  tenant_id: string
  transaction_type: 'deposit' | 'withdrawal'
  savings_type: 'pokok' | 'wajib' | 'sukarela'
  amount: number
  description?: string
  created_by: string
}) => {
  try {
    // 1. Buat transaksi
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        member_id: transactionData.member_id,
        tenant_id: transactionData.tenant_id,
        transaction_type: transactionData.transaction_type,
        savings_type: transactionData.savings_type,
        amount: transactionData.amount,
        description: transactionData.description,
        created_by: transactionData.created_by,
        transaction_date: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError.message)
      return { data: null, error: transactionError }
    }

    // 2. Update saldo di savings account
    const { data: savingsAccount, error: savingsError } = await supabaseAdmin
      .from('savings_accounts')
      .select('*')
      .eq('member_id', transactionData.member_id)
      .single()

    if (savingsError) {
      console.error('Error getting savings account:', savingsError.message)
      return { data: null, error: savingsError }
    }

    // Hitung saldo baru
    const multiplier = transactionData.transaction_type === 'deposit' ? 1 : -1
    const amount = transactionData.amount * multiplier
    
    const newBalance = {
      pokok_balance: savingsAccount.pokok_balance + (transactionData.savings_type === 'pokok' ? amount : 0),
      wajib_balance: savingsAccount.wajib_balance + (transactionData.savings_type === 'wajib' ? amount : 0),
      sukarela_balance: savingsAccount.sukarela_balance + (transactionData.savings_type === 'sukarela' ? amount : 0)
    }

    newBalance.total_balance = newBalance.pokok_balance + newBalance.wajib_balance + newBalance.sukarela_balance

    // Update savings account
    const { error: updateError } = await supabaseAdmin
      .from('savings_accounts')
      .update({
        ...newBalance,
        last_transaction_date: new Date().toISOString()
      })
      .eq('member_id', transactionData.member_id)

    if (updateError) {
      console.error('Error updating savings balance:', updateError.message)
      return { data: null, error: updateError }
    }

    return { data: transaction, error: null }
  } catch (error) {
    console.error('Unexpected error creating savings transaction:', error)
    return { data: null, error }
  }
}

/**
 * Helper untuk mendapatkan semua data tenant
 * @returns Array tenant atau array kosong jika error
 */
export const getAllTenants = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting all tenants:', error.message)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error getting all tenants:', error)
    return []
  }
}

export default supabaseAdmin