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
    const report_type = searchParams.get('report_type') || 'summary' // 'summary', 'movements', 'valuation'
    const date_from = searchParams.get('date_from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const date_to = searchParams.get('date_to') || new Date().toISOString()
    const seller_id = searchParams.get('seller_id')
    
    if (report_type === 'summary') {
      return await generateSummaryReport(supabase, tenant_id, seller_id)
    } else if (report_type === 'movements') {
      return await generateMovementsReport(supabase, tenant_id, date_from, date_to, seller_id)
    } else if (report_type === 'valuation') {
      return await generateValuationReport(supabase, tenant_id, seller_id)
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid report type' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateSummaryReport(supabase: any, tenant_id: string | null, seller_id: string | null) {
  let query = supabase
    .from('products')
    .select('id, name, category, stock_quantity, member_price, public_price, total_sold, seller_id')
    .eq('status', 'active')
  
  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id)
  }
  
  if (seller_id) {
    query = query.eq('seller_id', seller_id)
  }
  
  const { data: products, error } = await query
  
  if (error) {
    throw error
  }

  const summary = {
    total_products: products?.length || 0,
    total_stock_quantity: products?.reduce((sum, p) => sum + p.stock_quantity, 0) || 0,
    total_stock_value: products?.reduce((sum, p) => sum + (p.stock_quantity * p.member_price), 0) || 0,
    total_items_sold: products?.reduce((sum, p) => sum + (p.total_sold || 0), 0) || 0,
    out_of_stock: products?.filter(p => p.stock_quantity === 0).length || 0,
    low_stock: products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length || 0
  }

  const categoryBreakdown = products?.reduce((acc, product) => {
    const category = product.category
    if (!acc[category]) {
      acc[category] = {
        total_products: 0,
        total_stock: 0,
        total_value: 0,
        total_sold: 0
      }
    }
    acc[category].total_products += 1
    acc[category].total_stock += product.stock_quantity
    acc[category].total_value += product.stock_quantity * product.member_price
    acc[category].total_sold += product.total_sold || 0
    return acc
  }, {} as Record<string, any>) || {}

  const topSellingProducts = products
    ?.sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
    .slice(0, 10) || []

  const lowStockProducts = products
    ?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 10) || []

  return NextResponse.json({
    success: true,
    data: {
      summary,
      category_breakdown: categoryBreakdown,
      top_selling_products: topSellingProducts,
      low_stock_products: lowStockProducts,
      generated_at: new Date().toISOString()
    }
  })
}

async function generateMovementsReport(supabase: any, tenant_id: string | null, date_from: string, date_to: string, seller_id: string | null) {
  let query = supabase
    .from('inventory_logs')
    .select(`
      *,
      product:product_id(
        id,
        name,
        category,
        seller_id
      )
    `)
    .gte('created_at', date_from)
    .lte('created_at', date_to)
    .order('created_at', { ascending: false })
  
  if (seller_id) {
    query = query.eq('product.seller_id', seller_id)
  }
  
  const { data: movements, error } = await query
  
  if (error) {
    throw error
  }

  const filteredMovements = tenant_id 
    ? movements?.filter(m => m.product?.tenant_id === tenant_id) || []
    : movements || []

  const movementSummary = filteredMovements.reduce((acc, movement) => {
    const type = movement.change_type
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        total_quantity: 0
      }
    }
    acc[type].count += 1
    acc[type].total_quantity += movement.quantity_change
    return acc
  }, {} as Record<string, any>)

  const dailyMovements = filteredMovements.reduce((acc, movement) => {
    const date = movement.created_at.split('T')[0]
    if (!acc[date]) {
      acc[date] = {
        date,
        in: 0,
        out: 0,
        net: 0
      }
    }
    
    if (['restock', 'returned'].includes(movement.change_type)) {
      acc[date].in += movement.quantity_change
    } else {
      acc[date].out += movement.quantity_change
    }
    
    acc[date].net = acc[date].in - acc[date].out
    return acc
  }, {} as Record<string, any>)

  return NextResponse.json({
    success: true,
    data: {
      movements: filteredMovements,
      summary: movementSummary,
      daily_movements: Object.values(dailyMovements),
      period: {
        from: date_from,
        to: date_to
      },
      generated_at: new Date().toISOString()
    }
  })
}

async function generateValuationReport(supabase: any, tenant_id: string | null, seller_id: string | null) {
  let query = supabase
    .from('products')
    .select('id, name, category, stock_quantity, member_price, public_price, seller_id')
    .eq('status', 'active')
    .gt('stock_quantity', 0)
  
  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id)
  }
  
  if (seller_id) {
    query = query.eq('seller_id', seller_id)
  }
  
  const { data: products, error } = await query
  
  if (error) {
    throw error
  }

  const valuationData = products?.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category,
    stock_quantity: product.stock_quantity,
    unit_cost: product.member_price,
    unit_retail: product.public_price,
    total_cost_value: product.stock_quantity * product.member_price,
    total_retail_value: product.stock_quantity * product.public_price,
    potential_profit: product.stock_quantity * (product.public_price - product.member_price)
  })) || []

  const totalValuation = {
    total_items: valuationData.reduce((sum, item) => sum + item.stock_quantity, 0),
    total_cost_value: valuationData.reduce((sum, item) => sum + item.total_cost_value, 0),
    total_retail_value: valuationData.reduce((sum, item) => sum + item.total_retail_value, 0),
    total_potential_profit: valuationData.reduce((sum, item) => sum + item.potential_profit, 0)
  }

  const categoryValuation = valuationData.reduce((acc, item) => {
    const category = item.category
    if (!acc[category]) {
      acc[category] = {
        total_items: 0,
        total_cost_value: 0,
        total_retail_value: 0,
        total_potential_profit: 0
      }
    }
    acc[category].total_items += item.stock_quantity
    acc[category].total_cost_value += item.total_cost_value
    acc[category].total_retail_value += item.total_retail_value
    acc[category].total_potential_profit += item.potential_profit
    return acc
  }, {} as Record<string, any>)

  return NextResponse.json({
    success: true,
    data: {
      products: valuationData,
      total_valuation: totalValuation,
      category_valuation: categoryValuation,
      generated_at: new Date().toISOString()
    }
  })
}