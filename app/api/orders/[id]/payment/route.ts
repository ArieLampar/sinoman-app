import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const orderId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { payment_method, payment_proof_url } = body

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('member_id, status, payment_status, total_amount')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.member_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your order' },
        { status: 403 }
      )
    }

    if (order.status !== 'pending_payment') {
      return NextResponse.json(
        { success: false, error: 'Order is not pending payment' },
        { status: 400 }
      )
    }

    const updateData: any = {
      payment_status: 'paid',
      status: 'paid',
      payment_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (payment_method) {
      updateData.payment_method = payment_method
    }

    if (payment_proof_url) {
      updateData.payment_proof_url = payment_proof_url
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Payment confirmed successfully'
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const orderId = params.id
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        payment_method,
        payment_status,
        payment_date,
        payment_proof_url,
        status
      `)
      .eq('id', orderId)
      .eq('member_id', user.id)
      .single()
    
    if (error) {
      console.error('Error fetching payment info:', error)
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const paymentMethods = [
      {
        id: 'bank_transfer',
        name: 'Transfer Bank',
        description: 'Transfer ke rekening koperasi',
        account_info: {
          bank: 'BCA',
          account_number: '1234567890',
          account_name: 'Koperasi Sinoman'
        }
      },
      {
        id: 'e_wallet',
        name: 'E-Wallet',
        description: 'Pembayaran melalui DANA, OVO, GoPay',
        account_info: {
          dana: '081234567890',
          ovo: '081234567890',
          gopay: '081234567890'
        }
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        description: 'Bayar saat barang diterima',
        account_info: null
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        order,
        payment_methods: paymentMethods
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