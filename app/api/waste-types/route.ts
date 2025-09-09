import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const category = searchParams.get('category')
    const is_organic = searchParams.get('is_organic')
    const suitable_for_maggot = searchParams.get('suitable_for_maggot')
    const active_only = searchParams.get('active_only') !== 'false'

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('waste_types')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (is_organic !== null) {
      query = query.eq('is_organic', is_organic === 'true')
    }

    if (suitable_for_maggot !== null) {
      query = query.eq('suitable_for_maggot', suitable_for_maggot === 'true')
    }

    const { data: wasteTypes, error } = await query

    if (error) {
      console.error('Error fetching waste types:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch waste types' },
        { status: 500 }
      )
    }

    // Group by category for better organization
    const categorizedTypes = wasteTypes?.reduce((acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = []
      }
      acc[type.category].push(type)
      return acc
    }, {} as Record<string, typeof wasteTypes>)

    return NextResponse.json({
      success: true,
      data: wasteTypes,
      categorized: categorizedTypes,
      total: wasteTypes?.length || 0
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

    // Check if user is admin
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
    const { 
      tenant_id,
      name,
      category,
      subcategory,
      description,
      unit,
      price_per_unit,
      is_organic = false,
      suitable_for_maggot = false,
      processing_method,
      environmental_impact_score = 0
    } = body

    if (!tenant_id || !name || !category || !unit || price_per_unit === undefined) {
      return NextResponse.json(
        { success: false, error: 'Required fields: tenant_id, name, category, unit, price_per_unit' },
        { status: 400 }
      )
    }

    const { data: wasteType, error } = await supabase
      .from('waste_types')
      .insert({
        tenant_id,
        name,
        category,
        subcategory,
        description,
        unit,
        price_per_unit: parseFloat(price_per_unit),
        is_organic,
        suitable_for_maggot,
        processing_method,
        environmental_impact_score: parseInt(environmental_impact_score) || 0,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { success: false, error: 'Waste type with this name and category already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating waste type:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create waste type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: wasteType,
      message: 'Waste type created successfully'
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

    // Check if user is admin
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
    const { 
      id,
      tenant_id,
      name,
      category,
      subcategory,
      description,
      unit,
      price_per_unit,
      is_organic,
      suitable_for_maggot,
      processing_method,
      environmental_impact_score
    } = body

    if (!id || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'ID and tenant_id are required' },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (subcategory !== undefined) updateData.subcategory = subcategory
    if (description !== undefined) updateData.description = description
    if (unit !== undefined) updateData.unit = unit
    if (price_per_unit !== undefined) updateData.price_per_unit = parseFloat(price_per_unit)
    if (is_organic !== undefined) updateData.is_organic = is_organic
    if (suitable_for_maggot !== undefined) updateData.suitable_for_maggot = suitable_for_maggot
    if (processing_method !== undefined) updateData.processing_method = processing_method
    if (environmental_impact_score !== undefined) updateData.environmental_impact_score = parseInt(environmental_impact_score)

    const { data: wasteType, error } = await supabase
      .from('waste_types')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating waste type:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update waste type' },
        { status: 500 }
      )
    }

    if (!wasteType) {
      return NextResponse.json(
        { success: false, error: 'Waste type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: wasteType,
      message: 'Waste type updated successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
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
    const id = searchParams.get('id')
    const tenant_id = searchParams.get('tenant_id')

    if (!id || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'ID and tenant_id are required' },
        { status: 400 }
      )
    }

    // Check if waste type is being used in collections
    const { data: existingCollections, error: checkError } = await supabase
      .from('waste_collection_items')
      .select('id')
      .eq('waste_type_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking waste type usage:', checkError)
      return NextResponse.json(
        { success: false, error: 'Failed to check waste type usage' },
        { status: 500 }
      )
    }

    if (existingCollections && existingCollections.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete waste type that has been used in collections' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('waste_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    if (error) {
      console.error('Error deleting waste type:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete waste type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Waste type deleted successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}