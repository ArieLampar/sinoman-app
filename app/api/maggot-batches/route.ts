import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const status = searchParams.get('status')
    const collection_point_id = searchParams.get('collection_point_id')
    const manager_id = searchParams.get('manager_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const offset = (page - 1) * limit

    let query = supabase
      .from('maggot_batches')
      .select(`
        *,
        collection_point:collection_point_id(
          id,
          name,
          code,
          address
        ),
        manager:manager_id(
          id,
          full_name,
          phone
        ),
        maggot_batch_inputs(
          id,
          quantity_kg,
          added_date,
          waste_condition,
          collection_item:collection_item_id(
            id,
            quantity,
            waste_type:waste_type_id(
              name,
              category
            ),
            collection:collection_id(
              collection_number,
              member:member_id(full_name)
            )
          )
        ),
        maggot_harvests(
          id,
          harvest_date,
          fresh_maggot_kg,
          dried_maggot_kg,
          compost_kg,
          quality_grade,
          selling_price_per_kg
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenant_id)

    if (status) {
      query = query.eq('status', status)
    }

    if (collection_point_id) {
      query = query.eq('collection_point_id', collection_point_id)
    }

    if (manager_id) {
      query = query.eq('manager_id', manager_id)
    }

    if (date_from) {
      query = query.gte('start_date', date_from)
    }

    if (date_to) {
      query = query.lte('start_date', date_to)
    }

    query = query
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: batches, error, count } = await query

    if (error) {
      console.error('Error fetching maggot batches:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch maggot batches' },
        { status: 500 }
      )
    }

    // Calculate enhanced batch data
    const enhancedBatches = batches?.map(batch => {
      const totalHarvested = batch.maggot_harvests?.reduce((sum: number, harvest: any) => 
        sum + (harvest.fresh_maggot_kg || 0), 0) || 0
      
      const totalCompost = batch.maggot_harvests?.reduce((sum: number, harvest: any) => 
        sum + (harvest.compost_kg || 0), 0) || 0

      const totalRevenue = batch.maggot_harvests?.reduce((sum: number, harvest: any) => 
        sum + ((harvest.fresh_maggot_kg || 0) * (harvest.selling_price_per_kg || 0)), 0) || 0

      const daysActive = batch.actual_harvest_date 
        ? Math.ceil((new Date(batch.actual_harvest_date).getTime() - new Date(batch.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : Math.ceil((new Date().getTime() - new Date(batch.start_date).getTime()) / (1000 * 60 * 60 * 24))

      const actualConversionRate = batch.total_organic_waste_kg > 0 
        ? totalHarvested / batch.total_organic_waste_kg 
        : 0

      return {
        ...batch,
        days_active: daysActive,
        total_harvested_kg: totalHarvested,
        total_compost_kg: totalCompost,
        total_revenue: totalRevenue,
        actual_conversion_rate: actualConversionRate,
        efficiency_percentage: batch.estimated_maggot_yield_kg > 0 
          ? (totalHarvested / batch.estimated_maggot_yield_kg) * 100 
          : 0,
        harvest_count: batch.maggot_harvests?.length || 0
      }
    }) || []

    // Calculate summary statistics
    const totalBatches = count || 0
    const activeBatches = enhancedBatches.filter(b => b.status === 'active').length
    const harvestedBatches = enhancedBatches.filter(b => b.status === 'harvested').length
    const totalOrganicProcessed = enhancedBatches.reduce((sum, batch) => sum + batch.total_organic_waste_kg, 0)
    const totalMaggotProduced = enhancedBatches.reduce((sum, batch) => sum + batch.total_harvested_kg, 0)

    return NextResponse.json({
      success: true,
      data: enhancedBatches,
      pagination: {
        page,
        limit,
        total: totalBatches,
        total_pages: Math.ceil(totalBatches / limit)
      },
      summary: {
        total_batches: totalBatches,
        active_batches: activeBatches,
        harvested_batches: harvestedBatches,
        total_organic_processed_kg: totalOrganicProcessed,
        total_maggot_produced_kg: totalMaggotProduced,
        average_conversion_rate: totalOrganicProcessed > 0 ? totalMaggotProduced / totalOrganicProcessed : 0
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
      tenant_id,
      collection_point_id,
      manager_id,
      estimated_maggot_yield_kg,
      temperature_celsius,
      humidity_percent,
      ph_level,
      notes
    } = body

    if (!tenant_id || !collection_point_id) {
      return NextResponse.json(
        { success: false, error: 'tenant_id and collection_point_id are required' },
        { status: 400 }
      )
    }

    // Generate batch number
    const batchNumber = await generateBatchNumber(supabase, tenant_id)

    // Calculate expected harvest date (3 weeks from now)
    const expectedHarvestDate = new Date()
    expectedHarvestDate.setDate(expectedHarvestDate.getDate() + 21)

    const { data: batch, error: batchError } = await supabase
      .from('maggot_batches')
      .insert({
        tenant_id,
        batch_number: batchNumber,
        collection_point_id,
        manager_id: manager_id || user.id,
        expected_harvest_date: expectedHarvestDate.toISOString(),
        estimated_maggot_yield_kg,
        temperature_celsius,
        humidity_percent,
        ph_level,
        status: 'active'
      })
      .select(`
        *,
        collection_point:collection_point_id(name, address),
        manager:manager_id(full_name, phone)
      `)
      .single()

    if (batchError) {
      console.error('Error creating maggot batch:', batchError)
      return NextResponse.json(
        { success: false, error: 'Failed to create maggot batch' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: batch,
      message: 'Maggot batch created successfully'
    }, { status: 201 })
    
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

    const body = await request.json()
    const { 
      id,
      tenant_id,
      status,
      temperature_celsius,
      humidity_percent,
      ph_level,
      feeding_schedule,
      harvest_notes,
      actual_harvest_date
    } = body

    if (!id || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'id and tenant_id are required' },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status !== undefined) updateData.status = status
    if (temperature_celsius !== undefined) updateData.temperature_celsius = temperature_celsius
    if (humidity_percent !== undefined) updateData.humidity_percent = humidity_percent
    if (ph_level !== undefined) updateData.ph_level = ph_level
    if (feeding_schedule !== undefined) updateData.feeding_schedule = feeding_schedule
    if (harvest_notes !== undefined) updateData.harvest_notes = harvest_notes
    if (actual_harvest_date !== undefined) updateData.actual_harvest_date = actual_harvest_date

    const { data: batch, error: updateError } = await supabase
      .from('maggot_batches')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select(`
        *,
        collection_point:collection_point_id(name, address),
        manager:manager_id(full_name, phone)
      `)
      .single()

    if (updateError) {
      console.error('Error updating maggot batch:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update maggot batch' },
        { status: 500 }
      )
    }

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Maggot batch not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: batch,
      message: 'Maggot batch updated successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateBatchNumber(supabase: any, tenantId: string): Promise<string> {
  const today = new Date()
  const yearMonth = today.toISOString().slice(0, 7).replace('-', '')
  
  const { count } = await supabase
    .from('maggot_batches')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('start_date', `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)

  const sequence = String((count || 0) + 1).padStart(3, '0')
  return `MB-${yearMonth}-${sequence}`
}