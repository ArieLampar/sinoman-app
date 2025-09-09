import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type ShoppingCart = Database['public']['Tables']['shopping_carts']['Row']
type CartItem = Database['public']['Tables']['cart_items']['Row']
type InsertCartItem = Database['public']['Tables']['cart_items']['Insert']

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

    let { data: cart, error: cartError } = await supabase
      .from('shopping_carts')
      .select('*')
      .eq('member_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (cartError) {
      console.error('Error fetching cart:', cartError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    if (!cart && tenant_id) {
      const { data: newCart, error: createError } = await supabase
        .from('shopping_carts')
        .insert({
          member_id: user.id,
          tenant_id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating cart:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create cart' },
          { status: 500 }
        )
      }
      cart = newCart
    }

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: {
          cart: null,
          items: [],
          total_items: 0,
          total_amount: 0,
          member_total: 0,
          public_total: 0
        }
      })
    }

    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:product_id(
          id,
          name,
          member_price,
          public_price,
          discount_price,
          stock_quantity,
          images,
          category,
          weight_grams,
          min_order_quantity,
          seller_id,
          member:seller_id(
            full_name
          )
        )
      `)
      .eq('cart_id', cart.id)

    if (itemsError) {
      console.error('Error fetching cart items:', itemsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch cart items' },
        { status: 500 }
      )
    }

    const enhancedItems = items?.map(item => {
      const product = item.product
      const effectivePrice = product?.discount_price || product?.member_price || 0
      const publicPrice = product?.public_price || 0
      
      return {
        ...item,
        subtotal: effectivePrice * item.quantity,
        public_subtotal: publicPrice * item.quantity,
        in_stock: (product?.stock_quantity || 0) >= item.quantity,
        available_stock: product?.stock_quantity || 0
      }
    }) || []

    const totalItems = enhancedItems.reduce((sum, item) => sum + item.quantity, 0)
    const memberTotal = enhancedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const publicTotal = enhancedItems.reduce((sum, item) => sum + item.public_subtotal, 0)

    return NextResponse.json({
      success: true,
      data: {
        cart,
        items: enhancedItems,
        total_items: totalItems,
        total_amount: memberTotal,
        member_total: memberTotal,
        public_total: publicTotal,
        savings_amount: publicTotal - memberTotal
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
    const { product_id, quantity = 1, tenant_id } = body

    if (!product_id || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Product ID and tenant ID are required' },
        { status: 400 }
      )
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('status', 'active')
      .single()

    if (productError || !product) {
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

    let { data: cart, error: cartError } = await supabase
      .from('shopping_carts')
      .select('*')
      .eq('member_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .maybeSingle()

    if (cartError) {
      console.error('Error fetching cart:', cartError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    if (!cart) {
      const { data: newCart, error: createCartError } = await supabase
        .from('shopping_carts')
        .insert({
          member_id: user.id,
          tenant_id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createCartError) {
        console.error('Error creating cart:', createCartError)
        return NextResponse.json(
          { success: false, error: 'Failed to create cart' },
          { status: 500 }
        )
      }
      cart = newCart
    }

    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      
      if (product.stock_quantity < newQuantity) {
        return NextResponse.json(
          { success: false, error: 'Insufficient stock for total quantity' },
          { status: 400 }
        )
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
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
        message: 'Product quantity updated in cart'
      })
    } else {
      const itemData: InsertCartItem = {
        cart_id: cart.id,
        product_id,
        quantity,
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newItem, error: insertError } = await supabase
        .from('cart_items')
        .insert(itemData)
        .select(`
          *,
          product:product_id(*)
        `)
        .single()

      if (insertError) {
        console.error('Error adding cart item:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to add item to cart' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: newItem,
        message: 'Product added to cart'
      })
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: cart } = await supabase
      .from('shopping_carts')
      .select('id')
      .eq('member_id', user.id)
      .eq('status', 'active')
      .single()

    if (!cart) {
      return NextResponse.json({
        success: true,
        message: 'Cart is already empty'
      })
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)

    if (error) {
      console.error('Error clearing cart:', error)
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