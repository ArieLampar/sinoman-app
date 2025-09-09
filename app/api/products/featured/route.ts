import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50)
    const tenant_id = searchParams.get('tenant_id')
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    const { data: products, error } = await query
    
    if (error) {
      console.error('Error fetching featured products:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch featured products' },
        { status: 500 }
      )
    }

    const enhancedProducts = products?.map(product => ({
      ...product,
      rating_count: 0, // Will implement when reviews are available
      in_stock: (product.stock_quantity || 0) > 0,
      discount_percentage: product.discount_price && product.member_price
        ? Math.round((1 - product.discount_price / product.member_price) * 100)
        : 0
    })) || []

    return NextResponse.json({
      success: true,
      data: enhancedProducts
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}