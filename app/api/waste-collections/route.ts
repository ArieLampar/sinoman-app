import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const member_id = searchParams.get('member_id')
    const status = searchParams.get('status')
    const collection_point_id = searchParams.get('collection_point_id')
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
      .from('waste_collections')
      .select(`
        *,
        member:member_id(
          id,
          full_name,
          phone,
          email
        ),
        collection_point:collection_point_id(
          id,
          name,
          code,
          address
        ),
        collector:collector_id(
          id,
          full_name
        ),
        waste_collection_items(
          id,
          quantity,
          unit,
          unit_price,
          subtotal,
          quality_grade,
          contamination_level,
          allocated_to_maggot,
          processing_status,
          waste_type:waste_type_id(
            id,
            name,
            category,
            unit,
            is_organic,
            suitable_for_maggot
          )
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenant_id)

    if (member_id) {
      query = query.eq('member_id', member_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (collection_point_id) {
      query = query.eq('collection_point_id', collection_point_id)
    }

    if (date_from) {
      query = query.gte('collection_date', date_from)
    }

    if (date_to) {
      query = query.lte('collection_date', date_to)
    }

    query = query
      .order('collection_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: collections, error, count } = await query

    if (error) {
      console.error('Error fetching collections:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch collections' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const totalValue = collections?.reduce((sum, collection) => sum + collection.total_value, 0) || 0
    const totalWeight = collections?.reduce((sum, collection) => sum + collection.total_weight_kg, 0) || 0
    
    const statusCounts = collections?.reduce((acc, collection) => {
      acc[collection.status] = (acc[collection.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      success: true,
      data: collections,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      summary: {
        total_collections: count || 0,
        total_value: totalValue,
        total_weight_kg: totalWeight,
        status_counts: statusCounts
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
      member_id,
      collection_point_id,
      items,
      notes,
      images = [],
      weather_condition,
      collector_id
    } = body

    if (!tenant_id || !member_id || !collection_point_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Required fields: tenant_id, member_id, collection_point_id, items' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.waste_type_id || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item must have waste_type_id and positive quantity' },
          { status: 400 }
        )
      }
    }

    // Generate collection number
    const collectionNumber = await generateCollectionNumber(supabase, tenant_id)

    // Calculate total weight and value using pricing calculation
    const calculationResponse = await fetch(`${request.url.replace('/waste-collections', '/waste-types/calculate')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id, items })
    })

    if (!calculationResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to calculate collection value' },
        { status: 500 }
      )
    }

    const calculationData = await calculationResponse.json()
    if (!calculationData.success) {
      return NextResponse.json(
        { success: false, error: calculationData.error },
        { status: 500 }
      )
    }

    const { summary, items: calculatedItems } = calculationData.data

    // Check minimum deposit requirement
    if (!summary.meets_minimum_deposit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Minimum deposit amount is ${summary.minimum_deposit_amount}. Current value: ${summary.total_value}`,
          minimum_required: summary.minimum_deposit_amount,
          current_value: summary.total_value
        },
        { status: 400 }
      )
    }

    // Create collection record
    const { data: collection, error: collectionError } = await supabase
      .from('waste_collections')
      .insert({
        tenant_id,
        collection_number: collectionNumber,
        member_id,
        collection_point_id,
        collector_id: collector_id || user.id,
        total_weight_kg: summary.total_weight_kg,
        total_value: summary.total_value,
        status: 'pending',
        notes,
        images,
        weather_condition
      })
      .select()
      .single()

    if (collectionError) {
      console.error('Error creating collection:', collectionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create collection' },
        { status: 500 }
      )
    }

    // Create collection items
    const collectionItems = calculatedItems.map((item: any) => ({
      collection_id: collection.id,
      waste_type_id: item.waste_type_id,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.adjusted_unit_price,
      subtotal: item.subtotal,
      quality_grade: item.quality_grade,
      contamination_level: item.contamination_level
    }))

    const { error: itemsError } = await supabase
      .from('waste_collection_items')
      .insert(collectionItems)

    if (itemsError) {
      console.error('Error creating collection items:', itemsError)
      // Rollback collection
      await supabase.from('waste_collections').delete().eq('id', collection.id)
      return NextResponse.json(
        { success: false, error: 'Failed to create collection items' },
        { status: 500 }
      )
    }

    // Create or update member's waste bank account
    const { error: accountError } = await createOrUpdateWasteBankAccount(
      supabase, 
      tenant_id, 
      member_id, 
      summary.total_weight_kg
    )

    if (accountError) {
      console.error('Error updating waste bank account:', accountError)
      // Don't fail the collection, just log the error
    }

    // Record environmental impact
    await recordEnvironmentalImpact(supabase, tenant_id, collection.id, summary)

    // Fetch complete collection data
    const { data: completeCollection, error: fetchError } = await supabase
      .from('waste_collections')
      .select(`
        *,
        member:member_id(full_name, phone),
        collection_point:collection_point_id(name, address),
        collector:collector_id(full_name),
        waste_collection_items(
          *,
          waste_type:waste_type_id(name, category, unit)
        )
      `)
      .eq('id', collection.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete collection:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Collection created but failed to fetch details' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: completeCollection,
      calculation_summary: summary,
      message: 'Waste collection created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateCollectionNumber(supabase: any, tenantId: string): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 7).replace('-', '') // YYYYMM
  
  const { count, error } = await supabase
    .from('waste_collections')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)

  if (error) {
    console.error('Error counting collections:', error)
    // Fallback to timestamp-based number
    return `WC-${dateStr}-${Date.now().toString().slice(-6)}`
  }

  const sequence = String((count || 0) + 1).padStart(4, '0')
  return `WC-${dateStr}-${sequence}`
}

async function createOrUpdateWasteBankAccount(
  supabase: any, 
  tenantId: string, 
  memberId: string, 
  weightKg: number
) {
  try {
    // Check if account exists
    const { data: existingAccount, error: checkError } = await supabase
      .from('waste_bank_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('member_id', memberId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // Not found error
      throw checkError
    }

    if (!existingAccount) {
      // Create new account
      const accountNumber = await generateAccountNumber(supabase, tenantId)
      
      const { error: createError } = await supabase
        .from('waste_bank_accounts')
        .insert({
          tenant_id: tenantId,
          member_id: memberId,
          account_number: accountNumber,
          total_waste_kg: weightKg
        })

      if (createError) throw createError
    } else {
      // Update existing account
      const { error: updateError } = await supabase
        .from('waste_bank_accounts')
        .update({
          total_waste_kg: existingAccount.total_waste_kg + weightKg,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)

      if (updateError) throw updateError
    }

    return null
  } catch (error) {
    return error
  }
}

async function generateAccountNumber(supabase: any, tenantId: string): Promise<string> {
  const { count } = await supabase
    .from('waste_bank_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const sequence = String((count || 0) + 1).padStart(6, '0')
  return `WB${sequence}`
}

async function recordEnvironmentalImpact(
  supabase: any,
  tenantId: string,
  collectionId: string,
  summary: any
) {
  try {
    const impacts = [
      {
        tenant_id: tenantId,
        reference_type: 'collection',
        reference_id: collectionId,
        impact_type: 'co2_saved',
        quantity: summary.estimated_co2_saved_kg,
        unit: 'kg_co2',
        calculation_method: 'Weight * 2.3 kg CO2 per kg waste diverted'
      },
      {
        tenant_id: tenantId,
        reference_type: 'collection',
        reference_id: collectionId,
        impact_type: 'landfill_diverted',
        quantity: summary.total_weight_kg,
        unit: 'kg',
        calculation_method: 'Total weight of collected waste'
      }
    ]

    await supabase
      .from('environmental_impacts')
      .insert(impacts)

  } catch (error) {
    console.error('Error recording environmental impact:', error)
    // Don't throw - this is not critical for collection success
  }
}