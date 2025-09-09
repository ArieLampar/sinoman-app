import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type Order = Database['public']['Tables']['orders']['Row']
type InsertOrder = Database['public']['Tables']['orders']['Insert']
type InsertOrderItem = Database['public']['Tables']['order_items']['Insert']

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const status = searchParams.get('status')
    const tenant_id = searchParams.get('tenant_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
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
            images
          )
        ),
        order_deliveries(
          id,
          status,
          tracking_number,
          estimated_delivery_date,
          actual_delivery_date
        )
      `, { count: 'exact' })
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
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
      total_items: order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      delivery_status: order.order_deliveries?.[0]?.status || 'pending',
      tracking_number: order.order_deliveries?.[0]?.tracking_number || null,
      estimated_delivery: order.order_deliveries?.[0]?.estimated_delivery_date || null,
      actual_delivery: order.order_deliveries?.[0]?.actual_delivery_date || null
    })) || []

    return NextResponse.json({
      success: true,
      data: enhancedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      shipping_address,
      payment_method = 'cod',
      notes,
      tenant_id,
      coupon_code
    } = body

    if (!shipping_address || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Shipping address and tenant ID are required' },
        { status: 400 }
      )
    }

    const { data: cart, error: cartError } = await supabase
      .from('shopping_carts')
      .select(`
        *,
        cart_items(
          *,
          product:product_id(
            id,
            name,
            member_price,
            public_price,
            discount_price,
            stock_quantity,
            weight_grams,
            seller_id
          )
        )
      `)
      .eq('member_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .single()

    if (cartError || !cart || !cart.cart_items || cart.cart_items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      )
    }

    for (const item of cart.cart_items) {
      if (item.product && item.product.stock_quantity < item.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient stock for product: ${item.product.name}` 
          },
          { status: 400 }
        )
      }
    }

    let discountAmount = 0
    let couponId = null

    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', coupon_code)
        .eq('status', 'active')
        .eq('tenant_id', tenant_id)
        .gte('valid_until', new Date().toISOString())
        .single()

      if (!couponError && coupon) {
        couponId = coupon.id
        const subtotal = cart.cart_items.reduce((sum, item) => {
          const price = item.product?.discount_price || item.product?.member_price || 0
          return sum + (price * item.quantity)
        }, 0)

        if (coupon.discount_type === 'percentage') {
          discountAmount = Math.min(
            (subtotal * coupon.discount_value) / 100,
            coupon.max_discount_amount || Infinity
          )
        } else {
          discountAmount = Math.min(coupon.discount_value, subtotal)
        }

        if (subtotal < coupon.min_purchase_amount) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Minimum purchase amount is ${coupon.min_purchase_amount}` 
            },
            { status: 400 }
          )
        }
      }
    }

    const subtotal = cart.cart_items.reduce((sum, item) => {
      const price = item.product?.discount_price || item.product?.member_price || 0
      return sum + (price * item.quantity)
    }, 0)

    const totalWeight = cart.cart_items.reduce((sum, item) => {
      return sum + ((item.product?.weight_grams || 0) * item.quantity)
    }, 0)

    const shippingFee = calculateShippingFee(totalWeight, shipping_address)
    const adminFee = 2000
    const totalAmount = subtotal + shippingFee + adminFee - discountAmount

    const orderData: InsertOrder = {
      member_id: user.id,
      tenant_id,
      order_number: generateOrderNumber(),
      status: 'pending_payment',
      subtotal_amount: subtotal,
      discount_amount: discountAmount,
      shipping_fee: shippingFee,
      admin_fee: adminFee,
      total_amount: totalAmount,
      payment_method,
      payment_status: 'pending',
      shipping_address,
      notes,
      coupon_id: couponId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      )
    }

    const orderItems: InsertOrderItem[] = cart.cart_items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.product?.discount_price || item.product?.member_price || 0,
      subtotal: (item.product?.discount_price || item.product?.member_price || 0) * item.quantity,
      created_at: new Date().toISOString()
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create order items' },
        { status: 500 }
      )
    }

    for (const item of cart.cart_items) {
      if (item.product) {
        await supabase
          .from('products')
          .update({ 
            stock_quantity: item.product.stock_quantity - item.quantity,
            total_sold: (item.product.total_sold || 0) + item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product.id)

        await supabase
          .from('inventory_logs')
          .insert({
            product_id: item.product.id,
            change_type: 'sold',
            quantity_change: item.quantity,
            reason: `Order ${order.order_number}`,
            previous_quantity: item.product.stock_quantity,
            new_quantity: item.product.stock_quantity - item.quantity,
            created_at: new Date().toISOString()
          })
      }
    }

    if (couponId) {
      await supabase
        .from('discount_coupons')
        .update({ 
          usage_count: supabase.sql`usage_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId)
    }

    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)

    await supabase
      .from('shopping_carts')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', cart.id)

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order created successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `SIN-${timestamp}-${random}`
}

function calculateShippingFee(weightGrams: number, address: any): number {
  const baseRate = 8000
  const weightKg = Math.ceil(weightGrams / 1000)
  const additionalRate = Math.max(0, weightKg - 1) * 2000
  
  return baseRate + additionalRate
}