import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const member_only = searchParams.get('member_only') === 'true'
    
    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase
      .from('discount_coupons')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .gte('valid_until', new Date().toISOString())
      .gt('usage_limit', 0) // Simplified: just check if usage limit exists
      .order('created_at', { ascending: false })

    if (member_only && user) {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .single()

      if (!member) {
        return NextResponse.json({
          success: true,
          data: []
        })
      }

      query = query.eq('member_only', true)
    } else {
      query = query.eq('member_only', false)
    }
    
    const { data: coupons, error } = await query
    
    if (error) {
      console.error('Error fetching coupons:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch coupons' },
        { status: 500 }
      )
    }

    const enhancedCoupons = coupons?.map(coupon => ({
      ...coupon,
      remaining_usage: coupon.usage_limit - coupon.usage_count,
      expires_in_days: Math.ceil(
        (new Date(coupon.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
      discount_text: coupon.discount_type === 'percentage' 
        ? `${coupon.discount_value}% OFF`
        : `Rp ${coupon.discount_value.toLocaleString('id-ID')} OFF`
    })) || []

    return NextResponse.json({
      success: true,
      data: enhancedCoupons
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
    
    const body = await request.json()
    const { code, subtotal, tenant_id } = body

    if (!code || !subtotal || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Coupon code, subtotal, and tenant ID are required' },
        { status: 400 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data: coupon, error: couponError } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .gte('valid_until', new Date().toISOString())
      .single()

    if (couponError || !coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found or expired' },
        { status: 404 }
      )
    }

    if (coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json(
        { success: false, error: 'Coupon usage limit reached' },
        { status: 400 }
      )
    }

    if (coupon.member_only && user) {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .single()

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Coupon is only valid for members' },
          { status: 403 }
        )
      }
    }

    if (subtotal < coupon.min_purchase_amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Minimum purchase amount is Rp ${coupon.min_purchase_amount.toLocaleString('id-ID')}` 
        },
        { status: 400 }
      )
    }

    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.min(
        (subtotal * coupon.discount_value) / 100,
        coupon.max_discount_amount || Infinity
      )
    } else {
      discountAmount = Math.min(coupon.discount_value, subtotal)
    }

    const finalAmount = Math.max(0, subtotal - discountAmount)

    return NextResponse.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_purchase_amount: coupon.min_purchase_amount,
          max_discount_amount: coupon.max_discount_amount,
          valid_until: coupon.valid_until,
          member_only: coupon.member_only
        },
        calculation: {
          subtotal,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          savings_percentage: subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0
        },
        message: `Coupon applied! You saved Rp ${discountAmount.toLocaleString('id-ID')}`
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