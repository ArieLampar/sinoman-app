import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const with_counts = searchParams.get('with_counts') === 'true'
    
    let query = supabase
      .from('products')
      .select('category')
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    const { data: products, error } = await query
    
    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    const categoryCounts = products?.reduce((acc, product) => {
      const category = product.category
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const categories = Object.keys(categoryCounts).sort()
    
    const result = with_counts 
      ? categories.map(category => ({
          name: category,
          count: categoryCounts[category],
          slug: category.toLowerCase().replace(/\s+/g, '-')
        }))
      : categories.map(category => ({
          name: category,
          slug: category.toLowerCase().replace(/\s+/g, '-')
        }))

    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}