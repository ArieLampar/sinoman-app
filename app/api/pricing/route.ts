import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const product_ids = searchParams.get('product_ids')?.split(',') || []
    const tenant_id = searchParams.get('tenant_id')
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!product_ids.length) {
      return NextResponse.json(
        { success: false, error: 'Product IDs are required' },
        { status: 400 }
      )
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, member_price, public_price, discount_price')
      .in('id', product_ids)
      .eq('status', 'active')

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    let membershipStatus = 'public'
    let membershipInfo = null

    if (user && tenant_id) {
      const { data: member } = await supabase
        .from('members')
        .select('id, status, membership_type, full_name')
        .eq('id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .single()

      if (member) {
        membershipStatus = 'member'
        membershipInfo = {
          id: member.id,
          name: member.full_name,
          membership_type: member.membership_type,
          status: member.status
        }
      }
    }

    const pricingData = products?.map(product => {
      const isMember = membershipStatus === 'member'
      const effectivePrice = product.discount_price || 
                           (isMember ? product.member_price : product.public_price)
      
      const memberSavings = isMember 
        ? product.public_price - effectivePrice
        : product.public_price - product.member_price

      return {
        product_id: product.id,
        product_name: product.name,
        membership_status: membershipStatus,
        pricing: {
          public_price: product.public_price,
          member_price: product.member_price,
          discount_price: product.discount_price,
          effective_price: effectivePrice,
          savings_amount: memberSavings,
          savings_percentage: product.public_price > 0 
            ? Math.round((memberSavings / product.public_price) * 100)
            : 0
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: {
        membership_status: membershipStatus,
        member_info: membershipInfo,
        products: pricingData,
        total_savings: pricingData.reduce((sum, item) => sum + item.pricing.savings_amount, 0)
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
    const { items, tenant_id } = body

    if (!items?.length || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Items and tenant ID are required' },
        { status: 400 }
      )
    }

    const productIds = items.map((item: any) => item.product_id)
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, member_price, public_price, discount_price, stock_quantity')
      .in('id', productIds)
      .eq('status', 'active')

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    const { data: member } = await supabase
      .from('members')
      .select('id, status, membership_type, full_name')
      .eq('id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .single()

    const isMember = !!member
    const membershipStatus = isMember ? 'member' : 'public'

    const pricingCalculation = items.map((item: any) => {
      const product = products?.find(p => p.id === item.product_id)
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`)
      }

      const effectivePrice = product.discount_price || 
                           (isMember ? product.member_price : product.public_price)
      
      const quantity = item.quantity || 1
      const subtotal = effectivePrice * quantity
      const publicSubtotal = product.public_price * quantity
      const savings = publicSubtotal - subtotal

      return {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: effectivePrice,
        public_unit_price: product.public_price,
        member_unit_price: product.member_price,
        discount_unit_price: product.discount_price,
        subtotal,
        public_subtotal: publicSubtotal,
        savings_per_item: product.public_price - effectivePrice,
        total_savings: savings,
        in_stock: product.stock_quantity >= quantity,
        available_stock: product.stock_quantity
      }
    })

    const totals = {
      total_quantity: pricingCalculation.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: pricingCalculation.reduce((sum, item) => sum + item.subtotal, 0),
      public_subtotal: pricingCalculation.reduce((sum, item) => sum + item.public_subtotal, 0),
      total_savings: pricingCalculation.reduce((sum, item) => sum + item.total_savings, 0),
      savings_percentage: 0
    }

    if (totals.public_subtotal > 0) {
      totals.savings_percentage = Math.round((totals.total_savings / totals.public_subtotal) * 100)
    }

    return NextResponse.json({
      success: true,
      data: {
        membership_status: membershipStatus,
        member_info: member ? {
          id: member.id,
          name: member.full_name,
          membership_type: member.membership_type,
          status: member.status
        } : null,
        items: pricingCalculation,
        totals,
        benefits: {
          member_discount: isMember,
          savings_amount: totals.total_savings,
          savings_message: isMember 
            ? `Anda hemat Rp ${totals.total_savings.toLocaleString('id-ID')} dengan harga member!`
            : `Daftar sebagai member untuk hemat Rp ${totals.total_savings.toLocaleString('id-ID')}!`
        }
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}