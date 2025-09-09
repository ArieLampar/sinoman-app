import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { trackingNumber } = await params
    
    const { data: delivery, error } = await supabase
      .from('order_deliveries')
      .select(`
        *,
        order:order_id(
          id,
          order_number,
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
          full_name,
          phone,
          vehicle_type,
          license_plate
        )
      `)
      .eq('tracking_number', trackingNumber.toUpperCase())
      .single()
    
    if (error) {
      console.error('Error fetching delivery by tracking number:', error)
      return NextResponse.json(
        { success: false, error: 'Tracking number not found' },
        { status: 404 }
      )
    }

    const statusDescriptions = {
      pending: {
        title: 'Order Processing',
        description: 'Your order is being prepared for shipment',
        icon: '📦'
      },
      picked_up: {
        title: 'Picked Up',
        description: 'Package has been picked up by our driver',
        icon: '🚚'
      },
      in_transit: {
        title: 'In Transit',
        description: 'Your package is on the way',
        icon: '🛣️'
      },
      delivered: {
        title: 'Delivered',
        description: 'Package has been successfully delivered',
        icon: '✅'
      },
      failed: {
        title: 'Delivery Failed',
        description: 'Delivery attempt was unsuccessful',
        icon: '❌'
      },
      cancelled: {
        title: 'Cancelled',
        description: 'Delivery has been cancelled',
        icon: '🚫'
      }
    }

    const trackingEvents = []

    trackingEvents.push({
      status: 'pending',
      timestamp: delivery.created_at,
      title: 'Order Confirmed',
      description: 'Your order has been confirmed and is being prepared',
      location: 'Warehouse',
      active: true
    })

    if (delivery.pickup_time) {
      trackingEvents.push({
        status: 'picked_up',
        timestamp: delivery.pickup_time,
        title: 'Package Picked Up',
        description: `Picked up by ${delivery.driver?.full_name || 'driver'}`,
        location: 'Warehouse',
        active: true
      })
    }

    if (delivery.in_transit_time) {
      trackingEvents.push({
        status: 'in_transit',
        timestamp: delivery.in_transit_time,
        title: 'In Transit',
        description: 'Package is on the way to your address',
        location: delivery.current_location || 'On the road',
        active: true
      })
    }

    if (delivery.actual_delivery_date) {
      trackingEvents.push({
        status: 'delivered',
        timestamp: delivery.actual_delivery_date,
        title: 'Delivered',
        description: 'Package successfully delivered',
        location: delivery.shipping_address?.city || 'Destination',
        active: true
      })
    }

    const currentStatusInfo = statusDescriptions[delivery.status as keyof typeof statusDescriptions] || {
      title: delivery.status,
      description: 'Status update',
      icon: '📋'
    }

    const estimatedDelivery = delivery.estimated_delivery_date 
      ? new Date(delivery.estimated_delivery_date)
      : null

    const isDelayed = estimatedDelivery && 
      new Date() > estimatedDelivery && 
      delivery.status !== 'delivered'

    const trackingInfo = {
      tracking_number: delivery.tracking_number,
      current_status: delivery.status,
      current_status_info: currentStatusInfo,
      order_info: {
        order_number: delivery.order?.order_number,
        total_amount: delivery.order?.total_amount,
        recipient: delivery.order?.member?.full_name,
        phone: delivery.order?.member?.phone,
        address: delivery.shipping_address
      },
      driver_info: delivery.driver ? {
        name: delivery.driver.full_name,
        phone: delivery.driver.phone,
        vehicle: `${delivery.driver.vehicle_type} - ${delivery.driver.license_plate}`
      } : null,
      shipping_info: {
        provider: delivery.shipping_provider,
        estimated_delivery: delivery.estimated_delivery_date,
        actual_delivery: delivery.actual_delivery_date,
        is_delayed: isDelayed
      },
      tracking_events: trackingEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      items: delivery.order?.order_items || []
    }

    return NextResponse.json({
      success: true,
      data: trackingInfo
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}