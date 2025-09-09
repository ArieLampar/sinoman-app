import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type InventoryLog = Database['public']['Tables']['inventory_logs']['Row']
type InsertInventoryLog = Database['public']['Tables']['inventory_logs']['Insert']

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
    const product_id = searchParams.get('product_id')
    const change_type = searchParams.get('change_type')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const tenant_id = searchParams.get('tenant_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('inventory_logs')
      .select(`
        *,
        product:product_id(
          id,
          name,
          category,
          seller_id,
          member:seller_id(
            full_name
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
    
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    
    if (change_type) {
      query = query.eq('change_type', change_type)
    }
    
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    
    if (date_to) {
      query = query.lte('created_at', date_to)
    }
    
    if (tenant_id) {
      query = query.eq('product.tenant_id', tenant_id)
    }
    
    query = query.range(offset, offset + limit - 1)
    
    const { data: logs, error, count } = await query
    
    if (error) {
      console.error('Error fetching inventory logs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inventory logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
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
      product_id,
      change_type,
      quantity_change,
      reason,
      notes
    } = body

    if (!product_id || !change_type || !quantity_change || quantity_change <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product ID, change type, and positive quantity change are required' 
        },
        { status: 400 }
      )
    }

    const validChangeTypes = ['restock', 'sold', 'returned', 'damaged', 'expired', 'adjustment']
    if (!validChangeTypes.includes(change_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid change type' },
        { status: 400 }
      )
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock_quantity, seller_id')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.seller_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only manage inventory for your own products' },
        { status: 403 }
      )
    }

    const previousQuantity = product.stock_quantity
    let newQuantity: number

    switch (change_type) {
      case 'restock':
      case 'returned':
        newQuantity = previousQuantity + quantity_change
        break
      case 'sold':
      case 'damaged':
      case 'expired':
        newQuantity = Math.max(0, previousQuantity - quantity_change)
        break
      case 'adjustment':
        newQuantity = quantity_change
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid change type' },
          { status: 400 }
        )
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating product stock:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update product stock' },
        { status: 500 }
      )
    }

    const logData: InsertInventoryLog = {
      product_id,
      change_type,
      quantity_change,
      reason: reason || `${change_type.charAt(0).toUpperCase() + change_type.slice(1)} adjustment`,
      notes,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      created_at: new Date().toISOString()
    }

    const { data: log, error: logError } = await supabase
      .from('inventory_logs')
      .insert(logData)
      .select(`
        *,
        product:product_id(
          id,
          name,
          category
        )
      `)
      .single()

    if (logError) {
      console.error('Error creating inventory log:', logError)
      return NextResponse.json(
        { success: false, error: 'Failed to create inventory log' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        log,
        updated_product: updatedProduct
      },
      message: `Inventory ${change_type} recorded successfully`
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}