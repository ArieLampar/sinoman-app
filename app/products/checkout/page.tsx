'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Member, SavingsAccount } from '@/types/database.types'
import Link from 'next/link'

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  unit: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [member, setMember] = useState<Member | null>(null)
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null)
  type PaymentMethodType = 'cash' | 'bank_transfer' | 'savings_transfer'
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadCheckoutData()
  }, [])

  const loadCheckoutData = async () => {
    try {
      const savedCart = localStorage.getItem('cart')
      if (!savedCart) {
        router.push('/products/cart')
        return
      }
      setCartItems(JSON.parse(savedCart))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (memberData) {
        setMember(memberData)

        const { data: savingsData } = await supabase
          .from('savings_accounts')
          .select('*')
          .eq('member_id', memberData.id)
          .single()
        
        if (savingsData) {
          setSavingsAccount(savingsData)
        }
      }
    } catch (error) {
      console.error('Error loading checkout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const generateOrderNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `ORD-${year}${month}${day}-${random}`
  }

  const processOrder = async () => {
    if (!member) return
    
    setProcessing(true)
    try {
      const orderNumber = generateOrderNumber()
      const total = calculateTotal()

      if (paymentMethod === 'savings_transfer' && savingsAccount) {
        if (savingsAccount.sukarela_balance < total) {
          alert('Saldo simpanan sukarela tidak mencukupi!')
          setProcessing(false)
          return
        }
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          member_id: member.id,
          tenant_id: member.tenant_id,
          order_date: new Date().toISOString(),
          subtotal: total,
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash' ? 'pending' : 'paid',
          order_status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      for (const item of cartItems) {
        const { error: stockError } = await supabase.rpc('update_product_stock', {
          p_product_id: item.product_id,
          p_quantity: -item.quantity
        })
        
        if (stockError) console.error('Error updating stock:', stockError)
      }

      if (paymentMethod === 'savings_transfer' && savingsAccount) {
        const { error: savingsError } = await supabase
          .from('savings_transactions')
          .insert({
            member_id: member.id,
            tenant_id: member.tenant_id,
            transaction_type: 'withdrawal',
            savings_type: 'sukarela',
            amount: total,
            balance_before: savingsAccount.sukarela_balance,
            balance_after: savingsAccount.sukarela_balance - total,
            description: `Pembayaran order ${orderNumber}`,
            payment_method: 'savings_transfer',
            created_by: member.id,
            transaction_date: new Date().toISOString()
          })

        if (savingsError) console.error('Error creating savings transaction:', savingsError)

        await supabase
          .from('savings_accounts')
          .update({
            sukarela_balance: savingsAccount.sukarela_balance - total,
            total_balance: savingsAccount.total_balance - total,
            last_transaction_date: new Date().toISOString()
          })
          .eq('id', savingsAccount.id)
      }

      localStorage.removeItem('cart')
      alert('Order berhasil dibuat!')
      router.push(`/orders/${order.id}`)
    } catch (error) {
      console.error('Error processing order:', error)
      alert('Gagal memproses order. Silakan coba lagi.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!member || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Data checkout tidak valid</p>
        <div className="text-center mt-4">
          <Link href="/products/cart" className="text-green-600 hover:underline">
            Kembali ke Keranjang
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Informasi Pengiriman</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Nama:</span>
                <p className="font-medium">{member.full_name}</p>
              </div>
              <div>
                <span className="text-gray-600">No. Anggota:</span>
                <p className="font-medium">{member.member_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Telepon:</span>
                <p className="font-medium">{member.phone || '-'}</p>
              </div>
              <div>
                <span className="text-gray-600">Alamat:</span>
                <p className="font-medium">
                  {member.address || '-'}
                  {member.rt && member.rw && `, RT ${member.rt}/RW ${member.rw}`}
                  {member.village && `, ${member.village}`}
                  {member.district && `, ${member.district}`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Metode Pembayaran</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-4 h-4 text-green-600"
                />
                <div>
                  <p className="font-medium">Tunai</p>
                  <p className="text-sm text-gray-600">Bayar langsung di koperasi</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-4 h-4 text-green-600"
                />
                <div>
                  <p className="font-medium">Transfer Bank</p>
                  <p className="text-sm text-gray-600">Transfer melalui rekening bank</p>
                </div>
              </label>

              {savingsAccount && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="savings_transfer"
                    checked={paymentMethod === 'savings_transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <p className="font-medium">Potong Simpanan Sukarela</p>
                    <p className="text-sm text-gray-600">
                      Saldo: {formatCurrency(savingsAccount.sukarela_balance)}
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Daftar Produk</h2>
            <div className="space-y-3">
              {cartItems.map(item => (
                <div key={item.product_id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Ringkasan Order</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Biaya Pengiriman</span>
                <span>Gratis</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            
            <button
              onClick={processOrder}
              disabled={processing}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {processing ? 'Memproses...' : 'Buat Pesanan'}
            </button>
            
            <Link
              href="/products/cart"
              className="block text-center text-gray-600 hover:text-gray-800 mt-4 text-sm"
            >
              ← Kembali ke Keranjang
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}