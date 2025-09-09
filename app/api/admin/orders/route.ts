import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.id)
      .single()

    if (memberError || !member || member.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status')
    const payment_status = searchParams.get('payment_status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const search = searchParams.get('search') // order number or member name
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const tenant_id = searchParams.get('tenant_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        member:member_id(
          id,
          full_name,
          phone,
          email
        ),
        order_items(
          id,
          quantity,
          unit_price,
          subtotal,
          product:product_id(
            id,
            name,
            images,
            seller_id,
            member:seller_id(
              full_name
            )
          )
        ),
        order_deliveries(
          id,
          tracking_number,
          status,
          estimated_delivery_date,
          actual_delivery_date,
          driver:driver_id(
            full_name,
            phone
          )
        )
      `, { count: 'exact' })
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (payment_status && payment_status !== 'all') {
      query = query.eq('payment_status', payment_status)
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to)
    }
    
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,member.full_name.ilike.%${search}%`)
    }
    
    if (sort === 'amount') {
      query = query.order('total_amount', { ascending: order === 'asc' })
    } else if (sort === 'customer') {
      query = query.order('member.full_name', { ascending: order === 'asc' })
    } else {
      query = query.order(sort, { ascending: order === 'asc' })
    }
    
    query = query.range(offset, offset + limit - 1)
    
    const { data: orders, error, count } = await query
    
    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const enhancedOrders = orders?.map(order => ({
      ...order,
      customer_info: order.member,
      total_items: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      delivery_info: order.order_deliveries?.[0] || null,
      seller_info: order.order_items?.[0]?.product?.member || null,
      profit_margin: calculateProfitMargin(order),
      order_age_days: Math.ceil((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24))
    })) || []

    const analytics = {
      total_orders: count || 0,
      total_revenue: enhancedOrders.reduce((sum, order) => sum + order.total_amount, 0),
      average_order_value: enhancedOrders.length > 0 
        ? enhancedOrders.reduce((sum, order) => sum + order.total_amount, 0) / enhancedOrders.length 
        : 0,
      status_breakdown: enhancedOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: enhancedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      analytics
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.id)
      .single()

    if (memberError || !member || member.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, order_ids, updates } = body

    if (!action || !order_ids?.length) {
      return NextResponse.json(
        { success: false, error: 'Action and order IDs are required' },
        { status: 400 }
      )
    }

    let result
    switch (action) {
      case 'bulk_update_status':
        result = await bulkUpdateOrderStatus(supabase, order_ids, updates.status)
        break
      case 'bulk_cancel':
        result = await bulkCancelOrders(supabase, order_ids, updates.reason)
        break
      case 'bulk_approve_payment':
        result = await bulkApprovePayment(supabase, order_ids)
        break
      case 'bulk_ship':
        result = await bulkShipOrders(supabase, order_ids, updates.shipping_info)
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk ${action} completed successfully`
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateProfitMargin(order: any): number {
  if (!order.order_items?.length) return 0
  
  const totalCost = order.order_items.reduce((sum: number, item: any) => {
    // Assuming 70% of member price is cost
    const estimatedCost = (item.product?.member_price || item.unit_price) * 0.7
    return sum + (estimatedCost * item.quantity)
  }, 0)
  
  const profit = order.subtotal_amount - totalCost
  return order.subtotal_amount > 0 ? (profit / order.subtotal_amount) * 100 : 0
}

async function bulkUpdateOrderStatus(supabase: any, orderIds: string[], status: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .in('id', orderIds)
    .select('id, order_number, status')

  if (error) throw error
  return { updated_orders: data }
}

async function bulkCancelOrders(supabase: any, orderIds: string[], reason: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status: 'cancelled',
      notes: reason,
      updated_at: new Date().toISOString()
    })
    .in('id', orderIds)
    .select('id, order_number, status')

  if (error) throw error
  
  // Restore inventory for cancelled orders
  for (const orderId of orderIds) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)

    for (const item of orderItems || []) {
      await supabase.rpc('increment_product_stock', {
        product_id: item.product_id,
        quantity: item.quantity
      })
    }
  }
  
  return { cancelled_orders: data }
}

async function bulkApprovePayment(supabase: any, orderIds: string[]) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      payment_status: 'paid',
      status: 'paid',
      payment_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .in('id', orderIds)
    .select('id, order_number, payment_status')

  if (error) throw error
  return { approved_payments: data }
}

async function bulkShipOrders(supabase: any, orderIds: string[], shippingInfo: any) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status: 'shipped',
      updated_at: new Date().toISOString()
    })
    .in('id', orderIds)
    .select('id, order_number, status')

  if (error) throw error
  
  // Create delivery records
  for (const orderId of orderIds) {
    await supabase
      .from('order_deliveries')
      .insert({
        order_id: orderId,
        tracking_number: `TRK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        shipping_provider: shippingInfo?.provider || 'internal',
        estimated_delivery_date: shippingInfo?.estimated_date || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      })
  }
  
  return { shipped_orders: data }
}