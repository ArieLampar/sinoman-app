import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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
    const { tenant_id } = body

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Clear all cart items for the user
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('member_id', user.id)
      .eq('tenant_id', tenant_id)

    if (deleteError) {
      console.error('Error clearing cart:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to clear cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cart cleared successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}