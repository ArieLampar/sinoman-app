import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type DeliveryDriver = Database['public']['Tables']['delivery_drivers']['Row']
type InsertDeliveryDriver = Database['public']['Tables']['delivery_drivers']['Insert']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const tenant_id = searchParams.get('tenant_id')
    const available_only = searchParams.get('available_only') === 'true'
    
    let query = supabase
      .from('delivery_drivers')
      .select(`
        *,
        current_deliveries:order_deliveries(
          id,
          status,
          order:order_id(
            order_number
          )
        )
      `)
      .eq('status', status)
      .order('full_name')
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    if (available_only) {
      query = query.eq('is_available', true)
    }
    
    const { data: drivers, error } = await query
    
    if (error) {
      console.error('Error fetching delivery drivers:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch delivery drivers' },
        { status: 500 }
      )
    }

    const enhancedDrivers = drivers?.map(driver => ({
      ...driver,
      active_deliveries: driver.current_deliveries?.filter(d => 
        ['pending', 'picked_up', 'in_transit'].includes(d.status)
      ).length || 0,
      total_deliveries: driver.current_deliveries?.length || 0
    })) || []

    return NextResponse.json({
      success: true,
      data: enhancedDrivers
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
      full_name,
      phone,
      vehicle_type,
      license_plate,
      driver_license_number,
      tenant_id,
      coverage_areas = []
    } = body

    if (!full_name || !phone || !vehicle_type || !license_plate || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    const driverData: InsertDeliveryDriver = {
      full_name,
      phone,
      vehicle_type,
      license_plate: license_plate.toUpperCase(),
      driver_license_number,
      tenant_id,
      coverage_areas,
      status: 'active',
      is_available: true,
      rating: 5.0,
      total_deliveries: 0,
      successful_deliveries: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: driver, error: createError } = await supabase
      .from('delivery_drivers')
      .insert(driverData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating delivery driver:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create delivery driver' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: driver,
      message: 'Delivery driver created successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}