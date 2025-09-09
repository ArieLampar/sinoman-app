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
    const tenant_id = searchParams.get('tenant_id')
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
    
    const dateRanges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }

    const daysBack = dateRanges[period as keyof typeof dateRanges] || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let productQuery = supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        status,
        member_price,
        public_price,
        stock_quantity,
        total_sold,
        average_rating,
        total_reviews,
        featured,
        created_at,
        seller_id
      `)
    
    if (tenant_id) {
      productQuery = productQuery.eq('tenant_id', tenant_id)
    }

    const { data: products, error: productsError } = await productQuery

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products analytics' },
        { status: 500 }
      )
    }

    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        order_items(
          product_id,
          quantity,
          subtotal
        )
      `)
      .gte('created_at', startDate.toISOString())

    if (tenant_id) {
      ordersQuery = ordersQuery.eq('tenant_id', tenant_id)
    }

    const { data: orders, error: ordersError } = await ordersQuery

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders analytics' },
        { status: 500 }
      )
    }

    // Overall metrics
    const totalProducts = products?.length || 0
    const activeProducts = products?.filter(p => p.status === 'active').length || 0
    const totalInventoryValue = products?.reduce((sum, p) => sum + (p.stock_quantity * p.member_price), 0) || 0
    const outOfStockProducts = products?.filter(p => p.stock_quantity === 0).length || 0
    const lowStockProducts = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length || 0

    // Revenue analytics from orders
    const totalRevenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0
    
    // Category performance
    const categoryAnalytics = products?.reduce((acc, product) => {
      const category = product.category
      if (!acc[category]) {
        acc[category] = {
          total_products: 0,
          active_products: 0,
          total_stock: 0,
          total_value: 0,
          total_sold: 0,
          average_rating: 0,
          revenue: 0
        }
      }
      
      acc[category].total_products += 1
      if (product.status === 'active') acc[category].active_products += 1
      acc[category].total_stock += product.stock_quantity
      acc[category].total_value += product.stock_quantity * product.member_price
      acc[category].total_sold += product.total_sold || 0
      acc[category].average_rating += product.average_rating || 0
      
      return acc
    }, {} as Record<string, any>) || {}

    // Calculate category revenue from orders
    Object.keys(categoryAnalytics).forEach(category => {
      const categoryProducts = products?.filter(p => p.category === category).map(p => p.id) || []
      const categoryRevenue = orders?.reduce((sum, order) => {
        const categoryOrderValue = order.order_items
          ?.filter(item => categoryProducts.includes(item.product_id))
          ?.reduce((itemSum, item) => itemSum + item.subtotal, 0) || 0
        return sum + categoryOrderValue
      }, 0) || 0
      
      categoryAnalytics[category].revenue = categoryRevenue
      categoryAnalytics[category].average_rating = categoryAnalytics[category].average_rating / categoryAnalytics[category].total_products
    })

    // Top performing products
    const topSellingProducts = products
      ?.sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
      ?.slice(0, 10)
      ?.map(product => ({
        ...product,
        revenue: (product.total_sold || 0) * product.member_price
      })) || []

    // Low performing products
    const lowPerformingProducts = products
      ?.filter(p => p.status === 'active')
      ?.sort((a, b) => (a.total_sold || 0) - (b.total_sold || 0))
      ?.slice(0, 10) || []

    // Seller performance
    const sellerAnalytics = products?.reduce((acc, product) => {
      const sellerId = product.seller_id
      if (!acc[sellerId]) {
        acc[sellerId] = {
          total_products: 0,
          active_products: 0,
          total_stock: 0,
          total_sold: 0,
          revenue: 0
        }
      }
      
      acc[sellerId].total_products += 1
      if (product.status === 'active') acc[sellerId].active_products += 1
      acc[sellerId].total_stock += product.stock_quantity
      acc[sellerId].total_sold += product.total_sold || 0
      acc[sellerId].revenue += (product.total_sold || 0) * product.member_price
      
      return acc
    }, {} as Record<string, any>) || {}

    // Time series data for charts
    const dailySales = orders?.reduce((acc, order) => {
      const date = order.created_at.split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          orders: 0,
          revenue: 0
        }
      }
      acc[date].orders += 1
      acc[date].revenue += order.total_amount
      return acc
    }, {} as Record<string, any>) || {}

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_products: totalProducts,
          active_products: activeProducts,
          out_of_stock: outOfStockProducts,
          low_stock: lowStockProducts,
          total_inventory_value: totalInventoryValue,
          total_revenue: totalRevenue,
          completed_orders: completedOrders,
          period: period
        },
        category_analytics: Object.entries(categoryAnalytics).map(([category, data]) => ({
          category,
          ...data
        })),
        top_selling_products: topSellingProducts,
        low_performing_products: lowPerformingProducts,
        seller_analytics: Object.entries(sellerAnalytics).map(([seller_id, data]) => ({
          seller_id,
          ...data
        })),
        daily_sales: Object.values(dailySales).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        generated_at: new Date().toISOString()
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