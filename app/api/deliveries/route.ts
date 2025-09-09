import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type OrderDelivery = Database['public']['Tables']['order_deliveries']['Row']
type InsertOrderDelivery = Database['public']['Tables']['order_deliveries']['Insert']

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
    const tracking_number = searchParams.get('tracking_number')
    const driver_id = searchParams.get('driver_id')
    const order_id = searchParams.get('order_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('order_deliveries')
      .select(`
        *,
        order:order_id(
          id,
          order_number,
          member_id,
          total_amount,
          shipping_address,
          member:member_id(
            full_name,
            phone
          )
        ),
        driver:driver_id(
          id,
          full_name,
          phone,
          vehicle_type,
          license_plate
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
    
    if (order_id) {
      query = query.eq('order_id', order_id)
    } else {
      query = query.eq('order.member_id', user.id)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (tracking_number) {
      query = query.ilike('tracking_number', `%${tracking_number}%`)
    }
    
    if (driver_id) {
      query = query.eq('driver_id', driver_id)
    }
    
    query = query.range(offset, offset + limit - 1)
    
    const { data: deliveries, error, count } = await query
    
    if (error) {
      console.error('Error fetching deliveries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch deliveries' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: deliveries || [],
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
      order_id,
      driver_id,
      shipping_provider = 'internal',
      estimated_delivery_date
    } = body

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, shipping_address')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'paid' && order.status !== 'processing') {
      return NextResponse.json(
        { success: false, error: 'Order must be paid or processing to create delivery' },
        { status: 400 }
      )
    }

    const { data: existingDelivery } = await supabase
      .from('order_deliveries')
      .select('id')
      .eq('order_id', order_id)
      .single()

    if (existingDelivery) {
      return NextResponse.json(
        { success: false, error: 'Delivery already exists for this order' },
        { status: 400 }
      )
    }

    const trackingNumber = generateTrackingNumber()
    
    const deliveryData: InsertOrderDelivery = {
      order_id,
      tracking_number: trackingNumber,
      status: 'pending',
      shipping_provider,
      driver_id,
      estimated_delivery_date: estimated_delivery_date || calculateEstimatedDelivery(),
      shipping_address: order.shipping_address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from('order_deliveries')
      .insert(deliveryData)
      .select(`
        *,
        order:order_id(
          order_number,
          member:member_id(
            full_name,
            phone
          )
        ),
        driver:driver_id(
          full_name,
          phone,
          vehicle_type
        )
      `)
      .single()

    if (deliveryError) {
      console.error('Error creating delivery:', deliveryError)
      return NextResponse.json(
        { success: false, error: 'Failed to create delivery' },
        { status: 500 }
      )
    }

    await supabase
      .from('orders')
      .update({ 
        status: 'shipped',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)

    return NextResponse.json({
      success: true,
      data: delivery,
      message: 'Delivery created successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateTrackingNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TRK-${timestamp}-${random}`
}

function calculateEstimatedDelivery(): string {
  const estimatedDays = 2 // Default 2 days for internal delivery
  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays)
  return estimatedDate.toISOString()
}