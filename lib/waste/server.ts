import { createServerClient } from '@/lib/supabase/server'

export async function getWasteTransactions(
  memberId: string, 
  limit = 10,
  offset = 0
) {
  try {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('waste_transactions')
      .select(`
        id,
        transaction_number,
        transaction_date,
        total_weight_kg,
        total_value,
        net_value,
        payment_status,
        notes,
        waste_transaction_details (
          weight_kg,
          subtotal,
          condition_quality,
          waste_categories (
            category_name,
            sub_category
          )
        )
      `)
      .eq('member_id', memberId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching waste transactions:', error)
      return []
    }

    // Transform the data to match expected structure
    return data.map(transaction => ({
      id: transaction.id,
      transaction_number: transaction.transaction_number,
      transaction_date: transaction.transaction_date,
      total_weight_kg: transaction.total_weight_kg,
      total_value: transaction.total_value,
      net_value: transaction.net_value,
      payment_status: transaction.payment_status,
      details: transaction.waste_transaction_details.map(detail => ({
        waste_category: {
          category_name: detail.waste_categories?.category_name || 'Unknown',
          sub_category: detail.waste_categories?.sub_category || 'Unknown'
        },
        weight_kg: detail.weight_kg,
        subtotal: detail.subtotal
      }))
    }))
  } catch (error) {
    console.error('Unexpected error fetching waste transactions:', error)
    return []
  }
}

export async function getWasteCategories(tenantId?: string) {
  try {
    const supabase = await createServerClient()
    
    const query = supabase
      .from('waste_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name')

    // If tenantId is provided, we could filter by tenant-specific categories
    // For now, we'll show all active categories
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused = tenantId // Placeholder for future tenant-specific filtering
    
    const { data, error } = await query

    if (error) {
      console.error('Error fetching waste categories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error fetching waste categories:', error)
    return []
  }
}

export async function getCollectionPoints(tenantId: string) {
  try {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('collection_points')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('point_name')

    if (error) {
      console.error('Error fetching collection points:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error fetching collection points:', error)
    return []
  }
}

export async function getWasteStats(memberId: string, period: 'month' | 'year' = 'month') {
  try {
    const supabase = await createServerClient()
    
    const now = new Date()
    const startDate = period === 'month' 
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1)

    const { data, error } = await supabase
      .from('waste_transactions')
      .select('total_weight_kg, net_value, transaction_date')
      .eq('member_id', memberId)
      .gte('transaction_date', startDate.toISOString())
      .eq('payment_status', 'paid')

    if (error) {
      console.error('Error fetching waste stats:', error)
      return {
        totalWeight: 0,
        totalEarnings: 0,
        transactionCount: 0,
        avgPerTransaction: 0
      }
    }

    const totalWeight = data.reduce((sum, t) => sum + t.total_weight_kg, 0)
    const totalEarnings = data.reduce((sum, t) => sum + t.net_value, 0)
    const transactionCount = data.length
    const avgPerTransaction = transactionCount > 0 ? totalEarnings / transactionCount : 0

    return {
      totalWeight,
      totalEarnings,
      transactionCount,
      avgPerTransaction
    }
  } catch (error) {
    console.error('Unexpected error fetching waste stats:', error)
    return {
      totalWeight: 0,
      totalEarnings: 0,
      transactionCount: 0,
      avgPerTransaction: 0
    }
  }
}

export async function getMemberWasteRanking(tenantId: string, period: 'month' | 'year' = 'month') {
  try {
    const supabase = await createServerClient()
    
    const now = new Date()
    const startDate = period === 'month' 
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1)

    const { data, error } = await supabase
      .from('waste_transactions')
      .select(`
        member_id,
        total_weight_kg,
        net_value,
        members (
          full_name,
          member_number
        )
      `)
      .eq('members.tenant_id', tenantId)
      .gte('transaction_date', startDate.toISOString())
      .eq('payment_status', 'paid')

    if (error) {
      console.error('Error fetching waste ranking:', error)
      return []
    }

    // Group by member and calculate totals
    const memberStats = new Map()
    
    data.forEach(transaction => {
      const memberId = transaction.member_id
      if (!memberStats.has(memberId)) {
        memberStats.set(memberId, {
          member_id: memberId,
          full_name: transaction.members?.full_name || 'Unknown',
          member_number: transaction.members?.member_number || 'Unknown',
          total_weight: 0,
          total_earnings: 0,
          transaction_count: 0
        })
      }
      
      const stats = memberStats.get(memberId)
      stats.total_weight += transaction.total_weight_kg
      stats.total_earnings += transaction.net_value
      stats.transaction_count += 1
    })

    // Convert to array and sort by total weight
    return Array.from(memberStats.values())
      .sort((a, b) => b.total_weight - a.total_weight)
      .slice(0, 20) // Top 20
  } catch (error) {
    console.error('Unexpected error fetching waste ranking:', error)
    return []
  }
}