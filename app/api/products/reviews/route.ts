import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type InsertReview = Database['public']['Tables']['product_reviews']['Insert']

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
    const { product_id, rating, comment } = body

    if (!product_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Product ID and valid rating (1-5) are required' },
        { status: 400 }
      )
    }

    const { data: existingReview } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('product_id', product_id)
      .eq('member_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product' },
        { status: 400 }
      )
    }

    const reviewData: InsertReview = {
      product_id,
      member_id: user.id,
      rating,
      comment,
      created_at: new Date().toISOString()
    }

    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert(reviewData)
      .select(`
        *,
        member:member_id(
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating review:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create review' },
        { status: 500 }
      )
    }

    const { data: allReviews } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', product_id)

    const totalReviews = allReviews?.length || 0
    const averageRating = allReviews?.reduce((sum, r) => sum + r.rating, 0) / totalReviews || 0

    await supabase
      .from('products')
      .update({ 
        average_rating: averageRating,
        total_reviews: totalReviews,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review added successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}