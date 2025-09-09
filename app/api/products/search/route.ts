import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const category = searchParams.get('category')
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')
    const in_stock = searchParams.get('in_stock') === 'true'
    const sort = searchParams.get('sort') || 'relevance'
    const tenant_id = searchParams.get('tenant_id')
    
    const offset = (page - 1) * limit

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      )
    }
    
    let dbQuery = supabase
      .from('products')
      .select('*', { count: 'exact' })
    
    if (tenant_id) {
      dbQuery = dbQuery.eq('tenant_id', tenant_id)
    }
    
    // Search in description and category since name column may not exist
    dbQuery = dbQuery.or(`description.ilike.%${query}%,category.ilike.%${query}%`)
    
    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category)
    }
    
    if (min_price) {
      dbQuery = dbQuery.gte('member_price', parseFloat(min_price))
    }
    
    if (max_price) {
      dbQuery = dbQuery.lte('member_price', parseFloat(max_price))
    }
    
    if (in_stock) {
      dbQuery = dbQuery.gt('stock_quantity', 0)
    }
    
    switch (sort) {
      case 'price_low':
        dbQuery = dbQuery.order('member_price', { ascending: true })
        break
      case 'price_high':
        dbQuery = dbQuery.order('member_price', { ascending: false })
        break
      case 'rating':
        dbQuery = dbQuery.order('average_rating', { ascending: false })
        break
      case 'newest':
        dbQuery = dbQuery.order('created_at', { ascending: false })
        break
      case 'popular':
        dbQuery = dbQuery.order('total_sold', { ascending: false })
        break
      default: // relevance
        dbQuery = dbQuery.order('featured', { ascending: false })
          .order('total_sold', { ascending: false })
    }
    
    dbQuery = dbQuery.range(offset, offset + limit - 1)
    
    const { data: products, error, count } = await dbQuery
    
    if (error) {
      console.error('Error searching products:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search products' },
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

    const searchSuggestions = products?.length === 0 ? await getSuggestions(query, tenant_id) : []

    return NextResponse.json({
      success: true,
      data: enhancedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      search_query: query,
      suggestions: searchSuggestions
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getSuggestions(query: string, tenant_id?: string | null) {
  try {
    const supabase = await createServerClient()
    
    let dbQuery = supabase
      .from('products')
      .select('description, category')
      .limit(10)
    
    if (tenant_id) {
      dbQuery = dbQuery.eq('tenant_id', tenant_id)
    }
    
    const { data: products } = await dbQuery
    
    if (!products) return []
    
    const suggestions = new Set<string>()
    const queryLower = query.toLowerCase()
    
    products.forEach(product => {
      if (product.description && product.description.toLowerCase().includes(queryLower)) {
        suggestions.add(product.description.substring(0, 50))
      }
      
      if (product.category && product.category.toLowerCase().includes(queryLower)) {
        suggestions.add(product.category)
      }
    })
    
    return Array.from(suggestions).slice(0, 5)
    
  } catch (error) {
    console.error('Error getting suggestions:', error)
    return []
  }
}