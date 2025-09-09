import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const orderId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          quantity,
          unit_price,
          subtotal,
          product:product_id(
            id,
            name,
            images,
            category,
            weight_grams,
            seller_id,
            member:seller_id(
              full_name,
              phone
            )
          )
        ),
        order_deliveries(
          id,
          status,
          tracking_number,
          shipping_provider,
          estimated_delivery_date,
          actual_delivery_date,
          delivery_notes,
          driver:driver_id(
            full_name,
            phone,
            vehicle_type
          )
        ),
        discount_coupons!orders_coupon_id_fkey(
          code,
          discount_type,
          discount_value
        )
      `)
      .eq('id', orderId)
      .eq('member_id', user.id)
      .single()
    
    if (error) {
      console.error('Error fetching order:', error)
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const enhancedOrder = {
      ...order,
      total_items: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      total_weight: order.order_items?.reduce((sum, item) => 
        sum + ((item.product?.weight_grams || 0) * item.quantity), 0) || 0,
      delivery_info: order.order_deliveries?.[0] || null,
      coupon_info: order.discount_coupons || null
    }

    return NextResponse.json({
      success: true,
      data: enhancedOrder
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const orderId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status, shipping_address, notes } = body

    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('member_id, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (existingOrder.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your order' },
        { status: 403 }
      )
    }

    if (status && !canUpdateStatus(existingOrder.status, status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status transition' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (shipping_address) updateData.shipping_address = shipping_address
    if (notes) updateData.notes = notes

    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const orderId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('member_id, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (existingOrder.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your order' },
        { status: 403 }
      )
    }

    if (!['pending_payment', 'cancelled'].includes(existingOrder.status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel order in current status' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (deleteError) {
      console.error('Error cancelling order:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to cancel order' },
        { status: 500 }
      )
    }

    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        quantity,
        product:product_id(
          id,
          stock_quantity,
          total_sold
        )
      `)
      .eq('order_id', orderId)

    for (const item of orderItems || []) {
      if (item.product) {
        await supabase
          .from('products')
          .update({
            stock_quantity: item.product.stock_quantity + item.quantity,
            total_sold: Math.max(0, (item.product.total_sold || 0) - item.quantity),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product.id)

        await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.product.id,
            change_type: 'returned',
            quantity_change: item.quantity,
            reason: `Order ${orderId} cancelled`,
            previous_quantity: item.product.stock_quantity,
            new_quantity: item.product.stock_quantity + item.quantity,
            created_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function canUpdateStatus(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending_payment': ['paid', 'cancelled'],
    'paid': ['processing', 'cancelled'],
    'processing': ['shipped'],
    'shipped': ['delivered'],
    'delivered': ['completed'],
    'cancelled': [],
    'completed': []
  }

  return validTransitions[currentStatus]?.includes(newStatus) || false
}