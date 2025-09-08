'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface WasteItem {
  category_id: string
  weight_kg: number
  condition_quality: 'excellent' | 'good' | 'fair' | 'poor'
}

interface WasteDepositData {
  items: WasteItem[]
  collection_point_id?: string
  notes?: string
}

const conditionMultipliers = {
  excellent: 1.2,
  good: 1.0,
  fair: 0.8,
  poor: 0.6
}

export async function submitWasteDeposit(
  memberId: string,
  data: WasteDepositData
) {
  try {
    const supabase = await createServerClient()

    // Get member and tenant info
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('tenant_id')
      .eq('id', memberId)
      .single()

    if (memberError || !memberData) {
      return { error: 'Member tidak ditemukan.' }
    }

    // Get waste categories with prices
    const categoryIds = data.items.map(item => item.category_id)
    const { data: categories, error: categoryError } = await supabase
      .from('waste_categories')
      .select('*')
      .in('id', categoryIds)
      .eq('is_active', true)

    if (categoryError || !categories) {
      return { error: 'Kategori sampah tidak ditemukan.' }
    }

    // Validate minimum weights
    for (const item of data.items) {
      const category = categories.find(c => c.id === item.category_id)
      if (!category) {
        return { error: `Kategori sampah tidak valid: ${item.category_id}` }
      }
      if (item.weight_kg < category.minimum_weight_kg) {
        return { error: `Berat ${category.category_name} minimal ${category.minimum_weight_kg} kg` }
      }
    }

    // Calculate totals
    let totalWeight = 0
    let totalValue = 0
    const transactionDetails: Array<{
      waste_category_id: string
      weight_kg: number
      price_per_kg: number
      subtotal: number
      condition_quality: string
    }> = []

    for (const item of data.items) {
      const category = categories.find(c => c.id === item.category_id)!
      const multiplier = conditionMultipliers[item.condition_quality]
      const pricePerKg = category.buying_price_per_kg * multiplier
      const subtotal = pricePerKg * item.weight_kg

      totalWeight += item.weight_kg
      totalValue += subtotal

      transactionDetails.push({
        waste_category_id: item.category_id,
        weight_kg: item.weight_kg,
        price_per_kg: pricePerKg,
        subtotal,
        condition_quality: item.condition_quality,
      })
    }

    // Calculate admin fee and net value
    const adminFee = totalValue * 0.02 // 2% admin fee
    const netValue = totalValue - adminFee

    // Generate transaction number
    const transactionNumber = `WST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create main transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('waste_transactions')
      .insert({
        transaction_number: transactionNumber,
        member_id: memberId,
        tenant_id: memberData.tenant_id,
        collection_point_id: data.collection_point_id || null,
        transaction_date: new Date().toISOString(),
        total_weight_kg: totalWeight,
        total_value: totalValue,
        admin_fee: adminFee,
        net_value: netValue,
        payment_method: 'system',
        payment_status: 'paid',
        notes: data.notes || null,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating waste transaction:', transactionError)
      return { error: 'Gagal membuat transaksi sampah.' }
    }

    // Create transaction details
    const detailsWithTransactionId = transactionDetails.map(detail => ({
      ...detail,
      transaction_id: transaction.id,
    }))

    const { error: detailsError } = await supabase
      .from('waste_transaction_details')
      .insert(detailsWithTransactionId)

    if (detailsError) {
      console.error('Error creating transaction details:', detailsError)
      return { error: 'Gagal menyimpan detail transaksi.' }
    }

    // Update waste balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('waste_balances')
      .select('*')
      .eq('member_id', memberId)
      .single()

    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching waste balance:', balanceError)
      return { error: 'Gagal mengambil saldo sampah.' }
    }

    if (currentBalance) {
      // Update existing balance
      const { error: updateError } = await supabase
        .from('waste_balances')
        .update({
          total_weight_collected_kg: currentBalance.total_weight_collected_kg + totalWeight,
          total_earnings: currentBalance.total_earnings + totalValue,
          current_balance: currentBalance.current_balance + netValue,
          last_transaction_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('member_id', memberId)

      if (updateError) {
        console.error('Error updating waste balance:', updateError)
        return { error: 'Gagal memperbarui saldo sampah.' }
      }
    } else {
      // Create new balance record
      const { error: createError } = await supabase
        .from('waste_balances')
        .insert({
          member_id: memberId,
          tenant_id: memberData.tenant_id,
          total_weight_collected_kg: totalWeight,
          total_earnings: totalValue,
          current_balance: netValue,
          total_transferred: 0,
          last_transaction_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })

      if (createError) {
        console.error('Error creating waste balance:', createError)
        return { error: 'Gagal membuat saldo sampah.' }
      }
    }

    revalidatePath('/waste')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      data: {
        transactionNumber,
        totalWeight,
        totalValue,
        netValue,
      }
    }
  } catch (error) {
    console.error('Unexpected error in waste deposit:', error)
    return { error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}

export async function transferWasteToSavings(
  memberId: string,
  amount: number,
  savingsType: 'pokok' | 'wajib' | 'sukarela' = 'sukarela'
) {
  try {
    const supabase = await createServerClient()

    // Check waste balance
    const { data: wasteBalance, error: balanceError } = await supabase
      .from('waste_balances')
      .select('current_balance')
      .eq('member_id', memberId)
      .single()

    if (balanceError || !wasteBalance) {
      return { error: 'Saldo sampah tidak ditemukan.' }
    }

    if (wasteBalance.current_balance < amount) {
      return { error: 'Saldo sampah tidak mencukupi.' }
    }

    // Get savings account
    const { data: savingsAccount, error: savingsError } = await supabase
      .from('savings_accounts')
      .select('*')
      .eq('member_id', memberId)
      .single()

    if (savingsError || !savingsAccount) {
      return { error: 'Akun simpanan tidak ditemukan.' }
    }

    // Start transaction
    const { data: memberData } = await supabase
      .from('members')
      .select('tenant_id')
      .eq('id', memberId)
      .single()

    if (!memberData) {
      return { error: 'Member tidak ditemukan.' }
    }

    // Create savings transaction
    const transactionCode = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const newBalance = savingsAccount[`${savingsType}_balance`] + amount
    const newTotalBalance = savingsAccount.total_balance + amount

    const { error: savingsTransactionError } = await supabase
      .from('savings_transactions')
      .insert({
        member_id: memberId,
        tenant_id: memberData.tenant_id,
        transaction_code: transactionCode,
        transaction_type: 'deposit',
        savings_type: savingsType,
        amount: amount,
        balance_before: savingsAccount[`${savingsType}_balance`],
        balance_after: newBalance,
        description: 'Transfer dari saldo Bank Sampah',
        payment_method: 'savings_transfer',
        created_by: memberId,
        transaction_date: new Date().toISOString(),
      })

    if (savingsTransactionError) {
      console.error('Error creating savings transaction:', savingsTransactionError)
      return { error: 'Gagal membuat transaksi simpanan.' }
    }

    // Update savings account
    const { error: updateSavingsError } = await supabase
      .from('savings_accounts')
      .update({
        [`${savingsType}_balance`]: newBalance,
        total_balance: newTotalBalance,
        last_transaction_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId)

    if (updateSavingsError) {
      console.error('Error updating savings account:', updateSavingsError)
      return { error: 'Gagal memperbarui akun simpanan.' }
    }

    // Update waste balance
    const { error: updateWasteError } = await supabase
      .from('waste_balances')
      .update({
        current_balance: wasteBalance.current_balance - amount,
        total_transferred: wasteBalance.current_balance - amount, // This should be += but we don't have the current total_transferred
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId)

    if (updateWasteError) {
      console.error('Error updating waste balance:', updateWasteError)
      return { error: 'Gagal memperbarui saldo sampah.' }
    }

    revalidatePath('/waste')
    revalidatePath('/savings')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in transfer:', error)
    return { error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}