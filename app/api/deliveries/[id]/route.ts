import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const deliveryId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: delivery, error } = await supabase
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
          ),
          order_items(
            quantity,
            subtotal,
            product:product_id(
              name,
              images
            )
          )
        ),
        driver:driver_id(
          id,
          full_name,
          phone,
          vehicle_type,
          license_plate,
          avatar_url
        )
      `)
      .eq('id', deliveryId)
      .single()
    
    if (error) {
      console.error('Error fetching delivery:', error)
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      )
    }

    if (delivery.order?.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your delivery' },
        { status: 403 }
      )
    }

    const trackingHistory = [
      {
        status: 'pending',
        timestamp: delivery.created_at,
        description: 'Delivery created',
        location: 'Warehouse'
      }
    ]

    if (delivery.pickup_time) {
      trackingHistory.push({
        status: 'picked_up',
        timestamp: delivery.pickup_time,
        description: 'Package picked up by driver',
        location: 'Warehouse'
      })
    }

    if (delivery.in_transit_time) {
      trackingHistory.push({
        status: 'in_transit',
        timestamp: delivery.in_transit_time,
        description: 'Package in transit',
        location: 'On the road'
      })
    }

    if (delivery.actual_delivery_date) {
      trackingHistory.push({
        status: 'delivered',
        timestamp: delivery.actual_delivery_date,
        description: 'Package delivered successfully',
        location: delivery.shipping_address?.city || 'Destination'
      })
    }

    const enhancedDelivery = {
      ...delivery,
      tracking_history: trackingHistory.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      estimated_remaining_time: delivery.estimated_delivery_date && delivery.status !== 'delivered'
        ? Math.max(0, Math.ceil((new Date(delivery.estimated_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60)))
        : null
    }

    return NextResponse.json({
      success: true,
      data: enhancedDelivery
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
    const deliveryId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      status, 
      delivery_notes, 
      current_location,
      estimated_delivery_date
    } = body

    const { data: existingDelivery, error: fetchError } = await supabase
      .from('order_deliveries')
      .select(`
        *,
        order:order_id(member_id)
      `)
      .eq('id', deliveryId)
      .single()

    if (fetchError || !existingDelivery) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      )
    }

    if (existingDelivery.order?.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your delivery' },
        { status: 403 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      if (!isValidStatusTransition(existingDelivery.status, status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status transition' },
          { status: 400 }
        )
      }
      updateData.status = status

      const currentTime = new Date().toISOString()
      switch (status) {
        case 'picked_up':
          updateData.pickup_time = currentTime
          break
        case 'in_transit':
          updateData.in_transit_time = currentTime
          break
        case 'delivered':
          updateData.actual_delivery_date = currentTime
          break
      }
    }

    if (delivery_notes !== undefined) updateData.delivery_notes = delivery_notes
    if (current_location !== undefined) updateData.current_location = current_location
    if (estimated_delivery_date !== undefined) updateData.estimated_delivery_date = estimated_delivery_date

    const { data: updatedDelivery, error: updateError } = await supabase
      .from('order_deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select(`
        *,
        order:order_id(
          order_number
        ),
        driver:driver_id(
          full_name
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update delivery' },
        { status: 500 }
      )
    }

    if (status === 'delivered') {
      await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDelivery.order_id)
    }

    return NextResponse.json({
      success: true,
      data: updatedDelivery,
      message: `Delivery ${status ? 'status updated' : 'updated'} successfully`
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['picked_up', 'cancelled'],
    'picked_up': ['in_transit', 'cancelled'],
    'in_transit': ['delivered', 'failed'],
    'delivered': [],
    'cancelled': [],
    'failed': ['picked_up'] // Allow retry
  }

  return validTransitions[currentStatus]?.includes(newStatus) || false
}