import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const seller_id = searchParams.get('seller_id')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const tenant_id = searchParams.get('tenant_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('products')
      .select(`
        *,
        member:seller_id(
          id,
          full_name,
          phone,
          email
        ),
        product_reviews(
          id,
          rating
        ),
        inventory_logs(
          id,
          change_type,
          quantity_change,
          created_at
        )
      `, { count: 'exact' })
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (seller_id) {
      query = query.eq('seller_id', seller_id)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    if (sort === 'price') {
      query = query.order('member_price', { ascending: order === 'asc' })
    } else if (sort === 'stock') {
      query = query.order('stock_quantity', { ascending: order === 'asc' })
    } else if (sort === 'rating') {
      query = query.order('average_rating', { ascending: order === 'asc' })
    } else if (sort === 'sales') {
      query = query.order('total_sold', { ascending: order === 'asc' })
    } else {
      query = query.order(sort, { ascending: order === 'asc' })
    }
    
    query = query.range(offset, offset + limit - 1)
    
    const { data: products, error, count } = await query
    
    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    const enhancedProducts = products?.map(product => ({
      ...product,
      seller_info: product.member,
      rating_count: product.product_reviews?.length || 0,
      recent_stock_changes: product.inventory_logs
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.slice(0, 5) || [],
      performance_metrics: {
        conversion_rate: product.total_sold > 0 ? ((product.total_sold / (product.total_sold + 100)) * 100).toFixed(1) + '%' : '0%',
        stock_turnover: product.stock_quantity > 0 ? (product.total_sold / product.stock_quantity).toFixed(1) : 'N/A',
        revenue_generated: (product.total_sold || 0) * product.member_price
      }
    })) || []

    return NextResponse.json({
      success: true,
      data: enhancedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      analytics: {
        total_products: count || 0,
        total_revenue: enhancedProducts.reduce((sum, p) => sum + p.performance_metrics.revenue_generated, 0),
        average_rating: enhancedProducts.reduce((sum, p) => sum + (p.average_rating || 0), 0) / (enhancedProducts.length || 1)
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
    const { action, product_ids, updates } = body

    if (!action || !product_ids?.length) {
      return NextResponse.json(
        { success: false, error: 'Action and product IDs are required' },
        { status: 400 }
      )
    }

    let result
    switch (action) {
      case 'bulk_update_status':
        result = await bulkUpdateStatus(supabase, product_ids, updates.status)
        break
      case 'bulk_update_featured':
        result = await bulkUpdateFeatured(supabase, product_ids, updates.featured)
        break
      case 'bulk_update_category':
        result = await bulkUpdateCategory(supabase, product_ids, updates.category)
        break
      case 'bulk_delete':
        result = await bulkDelete(supabase, product_ids)
        break
      case 'bulk_approve':
        result = await bulkApprove(supabase, product_ids)
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk ${action} completed successfully`
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function bulkUpdateStatus(supabase: any, productIds: string[], status: string) {
  const { data, error } = await supabase
    .from('products')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .in('id', productIds)
    .select('id, name, status')

  if (error) throw error
  return { updated_products: data }
}

async function bulkUpdateFeatured(supabase: any, productIds: string[], featured: boolean) {
  const { data, error } = await supabase
    .from('products')
    .update({ 
      featured,
      updated_at: new Date().toISOString()
    })
    .in('id', productIds)
    .select('id, name, featured')

  if (error) throw error
  return { updated_products: data }
}

async function bulkUpdateCategory(supabase: any, productIds: string[], category: string) {
  const { data, error } = await supabase
    .from('products')
    .update({ 
      category,
      updated_at: new Date().toISOString()
    })
    .in('id', productIds)
    .select('id, name, category')

  if (error) throw error
  return { updated_products: data }
}

async function bulkDelete(supabase: any, productIds: string[]) {
  const { data, error } = await supabase
    .from('products')
    .update({ 
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .in('id', productIds)
    .select('id, name')

  if (error) throw error
  return { deleted_products: data }
}

async function bulkApprove(supabase: any, productIds: string[]) {
  const { data, error } = await supabase
    .from('products')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .in('id', productIds)
    .select('id, name, status')

  if (error) throw error
  return { approved_products: data }
}