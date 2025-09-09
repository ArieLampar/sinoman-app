import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type Product = Database['public']['Tables']['products']['Row']
type InsertProduct = Database['public']['Tables']['products']['Insert']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const status = searchParams.get('status') || 'active'
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const tenant_id = searchParams.get('tenant_id')
    const seller_id = searchParams.get('seller_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('products')
      .select('*')
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    if (seller_id) {
      query = query.eq('seller_id', seller_id)
    }
    
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`)
    }
    
    if (featured === 'true') {
      query = query.eq('featured', true)
    }
    
    if (sort === 'price') {
      query = query.order('member_price', { ascending: order === 'asc' })
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
      rating_count: 0, // Will implement when reviews table is available
      in_stock: product.stock_quantity > 0,
      discount_percentage: product.discount_price 
        ? Math.round((1 - product.discount_price / product.member_price) * 100)
        : 0
    })) || []

    return NextResponse.json({
      success: true,
      data: enhancedProducts,
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
      name,
      description,
      category,
      member_price,
      public_price,
      discount_price,
      stock_quantity,
      min_order_quantity = 1,
      weight_grams,
      dimensions,
      images,
      tags,
      featured = false,
      tenant_id
    } = body

    if (!name || !category || !member_price || !public_price || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const productData: InsertProduct = {
      name,
      description,
      category,
      member_price,
      public_price,
      discount_price,
      stock_quantity,
      min_order_quantity,
      weight_grams,
      dimensions,
      images,
      tags,
      featured,
      status: 'active',
      seller_id: user.id,
      tenant_id,
      average_rating: 0,
      total_reviews: 0,
      total_sold: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create product' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}