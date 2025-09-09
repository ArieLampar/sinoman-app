import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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
    const tenant_id = searchParams.get('tenant_id')
    const alert_type = searchParams.get('alert_type') // 'low_stock', 'out_of_stock', 'all'
    const seller_only = searchParams.get('seller_only') === 'true'
    
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        stock_quantity,
        category,
        member_price,
        images,
        seller_id,
        member:seller_id(
          full_name
        )
      `)
      .eq('status', 'active')
      .order('stock_quantity', { ascending: true })
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }
    
    if (seller_only) {
      query = query.eq('seller_id', user.id)
    }
    
    const { data: products, error } = await query
    
    if (error) {
      console.error('Error fetching products for alerts:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inventory alerts' },
        { status: 500 }
      )
    }

    const LOW_STOCK_THRESHOLD = 10
    const outOfStockProducts = products?.filter(p => p.stock_quantity === 0) || []
    const lowStockProducts = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD) || []

    let alerts: any[] = []

    if (alert_type === 'out_of_stock' || alert_type === 'all' || !alert_type) {
      alerts = alerts.concat(outOfStockProducts.map(product => ({
        id: `out_of_stock_${product.id}`,
        type: 'out_of_stock',
        severity: 'high',
        product,
        message: `${product.name} is out of stock`,
        action_required: 'Restock immediately',
        created_at: new Date().toISOString()
      })))
    }

    if (alert_type === 'low_stock' || alert_type === 'all' || !alert_type) {
      alerts = alerts.concat(lowStockProducts.map(product => ({
        id: `low_stock_${product.id}`,
        type: 'low_stock',
        severity: 'medium',
        product,
        message: `${product.name} is running low (${product.stock_quantity} left)`,
        action_required: 'Consider restocking soon',
        created_at: new Date().toISOString()
      })))
    }

    const alertSummary = {
      total_alerts: alerts.length,
      out_of_stock: outOfStockProducts.length,
      low_stock: lowStockProducts.length,
      high_priority: outOfStockProducts.length,
      medium_priority: lowStockProducts.length
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary: alertSummary,
        thresholds: {
          low_stock_threshold: LOW_STOCK_THRESHOLD
        }
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