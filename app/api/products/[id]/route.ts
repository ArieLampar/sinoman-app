import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type Product = Database['public']['Tables']['products']['Row']
type UpdateProduct = Database['public']['Tables']['products']['Update']

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const productId = params.id
    
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        member:seller_id(
          id,
          full_name,
          phone,
          avatar_url,
          address
        ),
        product_reviews(
          id,
          rating,
          comment,
          created_at,
          member:member_id(
            full_name,
            avatar_url
          )
        ),
        inventory_logs!inventory_logs_product_id_fkey(
          id,
          change_type,
          quantity_change,
          reason,
          created_at
        )
      `)
      .eq('id', productId)
      .eq('status', 'active')
      .single()
    
    if (error) {
      console.error('Error fetching product:', error)
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const enhancedProduct = {
      ...product,
      rating_count: product.product_reviews?.length || 0,
      in_stock: product.stock_quantity > 0,
      discount_percentage: product.discount_price 
        ? Math.round((1 - product.discount_price / product.member_price) * 100)
        : 0,
      recent_reviews: product.product_reviews
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.slice(0, 5) || [],
      stock_history: product.inventory_logs
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.slice(0, 10) || []
    }

    return NextResponse.json({
      success: true,
      data: enhancedProduct
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const productId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      member_price,
      public_price,
      discount_price,
      stock_quantity,
      min_order_quantity,
      weight_grams,
      dimensions,
      images,
      tags,
      featured,
      status
    } = body

    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('seller_id, stock_quantity')
      .eq('id', productId)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (existingProduct.seller_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only update your own products' },
        { status: 403 }
      )
    }

    const updateData: UpdateProduct = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (member_price !== undefined) updateData.member_price = member_price
    if (public_price !== undefined) updateData.public_price = public_price
    if (discount_price !== undefined) updateData.discount_price = discount_price
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity
    if (min_order_quantity !== undefined) updateData.min_order_quantity = min_order_quantity
    if (weight_grams !== undefined) updateData.weight_grams = weight_grams
    if (dimensions !== undefined) updateData.dimensions = dimensions
    if (images !== undefined) updateData.images = images
    if (tags !== undefined) updateData.tags = tags
    if (featured !== undefined) updateData.featured = featured
    if (status !== undefined) updateData.status = status

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update product' },
        { status: 500 }
      )
    }

    if (stock_quantity !== undefined && stock_quantity !== existingProduct.stock_quantity) {
      const quantityChange = stock_quantity - existingProduct.stock_quantity
      await supabase
        .from('inventory_logs')
        .insert({
          product_id: productId,
          change_type: quantityChange > 0 ? 'restock' : 'sold',
          quantity_change: Math.abs(quantityChange),
          reason: quantityChange > 0 ? 'Manual restock' : 'Manual adjustment',
          previous_quantity: existingProduct.stock_quantity,
          new_quantity: stock_quantity,
          created_at: new Date().toISOString()
        })
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const productId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (existingProduct.seller_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only delete your own products' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('products')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}