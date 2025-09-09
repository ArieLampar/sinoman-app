import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const supabase = await createServerClient()
    const itemId = params.itemId
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { quantity } = body

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity is required' },
        { status: 400 }
      )
    }

    const { data: cartItem, error: fetchError } = await supabase
      .from('cart_items')
      .select(`
        *,
        cart:cart_id(
          member_id
        ),
        product:product_id(
          stock_quantity,
          min_order_quantity
        )
      `)
      .eq('id', itemId)
      .single()

    if (fetchError || !cartItem) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      )
    }

    if (cartItem.cart?.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your cart item' },
        { status: 403 }
      )
    }

    const product = cartItem.product
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.stock_quantity < quantity) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock' },
        { status: 400 }
      )
    }

    if (quantity < product.min_order_quantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Minimum order quantity is ${product.min_order_quantity}` 
        },
        { status: 400 }
      )
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('cart_items')
      .update({ 
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select(`
        *,
        product:product_id(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating cart item:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update cart item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Cart item updated successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const supabase = await createServerClient()
    const itemId = params.itemId
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: cartItem, error: fetchError } = await supabase
      .from('cart_items')
      .select(`
        *,
        cart:cart_id(
          member_id
        )
      `)
      .eq('id', itemId)
      .single()

    if (fetchError || !cartItem) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      )
    }

    if (cartItem.cart?.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your cart item' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      console.error('Error deleting cart item:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete cart item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}