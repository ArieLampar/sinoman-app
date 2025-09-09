'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type CartItem = {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    member_price: number
    public_price: number
    discount_price?: number
    images?: string[]
    weight_grams: number
    seller_id: string
    member?: {
      full_name: string
    }
  }
}

type CartSummary = {
  total_items: number
  subtotal_amount: number
  total_savings: number
  estimated_shipping: number
  total_amount: number
  total_weight: number
}

type Member = {
  id: string
  full_name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
}

type DeliveryMethod = {
  id: string
  name: string
  description: string
  price: number
  estimated_days: string
  available: boolean
}

type PaymentMethod = {
  id: string
  name: string
  description: string
  fee: number
  available: boolean
  icon: string
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingOrder, setProcessingOrder] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form states
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postal_code: '',
    notes: ''
  })
  
  const [selectedDelivery, setSelectedDelivery] = useState<string>('')
  const [selectedPayment, setSelectedPayment] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  // Mock delivery methods
  const deliveryMethods: DeliveryMethod[] = [
    {
      id: 'regular',
      name: 'Pengiriman Reguler',
      description: 'Estimasi 3-5 hari kerja',
      price: 15000,
      estimated_days: '3-5 hari',
      available: true
    },
    {
      id: 'express',
      name: 'Pengiriman Express',
      description: 'Estimasi 1-2 hari kerja',
      price: 25000,
      estimated_days: '1-2 hari',
      available: true
    },
    {
      id: 'sameday',
      name: 'Same Day Delivery',
      description: 'Pengiriman hari yang sama (Jakarta)',
      price: 35000,
      estimated_days: 'Hari ini',
      available: false // Based on location
    }
  ]

  // Mock payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'bank_transfer',
      name: 'Transfer Bank',
      description: 'Transfer ke rekening koperasi',
      fee: 0,
      available: true,
      icon: '🏦'
    },
    {
      id: 'cod',
      name: 'Bayar di Tempat (COD)',
      description: 'Bayar saat barang diterima',
      fee: 5000,
      available: true,
      icon: '💵'
    },
    {
      id: 'ewallet',
      name: 'E-Wallet',
      description: 'GoPay, OVO, DANA',
      fee: 2500,
      available: true,
      icon: '📱'
    },
    {
      id: 'credit_card',
      name: 'Kartu Kredit',
      description: 'Visa, Mastercard, dll',
      fee: 8000,
      available: false,
      icon: '💳'
    }
  ]

  useEffect(() => {
    checkAuth()
    fetchCartAndMember()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/checkout')
      return
    }
  }

  const fetchCartAndMember = async () => {
    try {
      setLoading(true)
      
      // Fetch cart items
      const cartResponse = await fetch('/api/cart?tenant_id=demo-tenant')
      const cartData = await cartResponse.json()
      
      if (!cartData.success || !cartData.data.items?.length) {
        router.push('/cart')
        return
      }
      
      setCartItems(cartData.data.items)
      setCartSummary(cartData.data.summary)

      // Fetch member profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('*')
          .eq('id', user.id)
          .single()

        if (memberData) {
          setMember(memberData)
          setShippingAddress({
            full_name: memberData.full_name || '',
            phone: memberData.phone || '',
            street: memberData.address || '',
            city: memberData.city || '',
            province: memberData.province || '',
            postal_code: memberData.postal_code || '',
            notes: ''
          })
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push('/cart')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!validateForm()) return

    try {
      setProcessingOrder(true)

      const orderData = {
        shipping_address: shippingAddress,
        delivery_method: selectedDelivery,
        payment_method: selectedPayment,
        notes: orderNotes,
        tenant_id: 'demo-tenant'
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      const data = await response.json()
      
      if (data.success) {
        // Clear cart after successful order
        await fetch('/api/cart/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: 'demo-tenant' })
        })

        router.push(`/orders/${data.data.id}?created=true`)
      } else {
        alert(data.error || 'Gagal membuat pesanan')
      }
      
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Terjadi kesalahan saat membuat pesanan')
    } finally {
      setProcessingOrder(false)
    }
  }

  const validateForm = () => {
    if (!shippingAddress.full_name || !shippingAddress.phone || !shippingAddress.street) {
      alert('Mohon lengkapi alamat pengiriman')
      setCurrentStep(1)
      return false
    }
    
    if (!selectedDelivery) {
      alert('Mohon pilih metode pengiriman')
      setCurrentStep(2)
      return false
    }
    
    if (!selectedPayment) {
      alert('Mohon pilih metode pembayaran')
      setCurrentStep(3)
      return false
    }
    
    if (!agreeTerms) {
      alert('Mohon setujui syarat dan ketentuan')
      setCurrentStep(3)
      return false
    }
    
    return true
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatWeight = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)} kg`
    }
    return `${grams} gr`
  }

  const getDeliveryPrice = () => {
    const method = deliveryMethods.find(m => m.id === selectedDelivery)
    return method?.price || 0
  }

  const getPaymentFee = () => {
    const method = paymentMethods.find(m => m.id === selectedPayment)
    return method?.fee || 0
  }

  const getFinalTotal = () => {
    if (!cartSummary) return 0
    return cartSummary.total_amount + getDeliveryPrice() + getPaymentFee()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛒 Checkout</h1>
            <p className="text-gray-600 mt-2">Selesaikan pesanan Anda</p>
          </div>
          <Link
            href="/cart"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Kembali ke Keranjang
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, title: 'Alamat' },
              { step: 2, title: 'Pengiriman' },
              { step: 3, title: 'Pembayaran' }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= item.step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {item.step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= item.step ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {item.title}
                </span>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    currentStep > item.step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Shipping Address */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">1. Alamat Pengiriman</h2>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {currentStep === 1 ? 'Sedang mengisi' : 'Edit'}
                </button>
              </div>

              {currentStep === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.full_name}
                      onChange={(e) => setShippingAddress({...shippingAddress, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nomor Telepon *
                    </label>
                    <input
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alamat Lengkap *
                    </label>
                    <textarea
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan alamat lengkap termasuk nomor rumah, RT/RW"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kota/Kabupaten
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provinsi
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.province}
                      onChange={(e) => setShippingAddress({...shippingAddress, province: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.postal_code}
                      onChange={(e) => setShippingAddress({...shippingAddress, postal_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catatan untuk Kurir
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.notes}
                      onChange={(e) => setShippingAddress({...shippingAddress, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contoh: Rumah pagar hijau"
                    />
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={!shippingAddress.full_name || !shippingAddress.phone || !shippingAddress.street}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Lanjut ke Pengiriman
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium">{shippingAddress.full_name}</div>
                  <div className="text-sm text-gray-600">{shippingAddress.phone}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {shippingAddress.street}
                    {shippingAddress.city && `, ${shippingAddress.city}`}
                    {shippingAddress.province && `, ${shippingAddress.province}`}
                    {shippingAddress.postal_code && ` ${shippingAddress.postal_code}`}
                  </div>
                  {shippingAddress.notes && (
                    <div className="text-sm text-gray-600 italic mt-1">
                      Catatan: {shippingAddress.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Delivery Method */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">2. Metode Pengiriman</h2>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {currentStep === 2 ? 'Sedang memilih' : 'Edit'}
                </button>
              </div>

              {currentStep === 2 ? (
                <div className="space-y-3">
                  {deliveryMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDelivery === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="delivery"
                          value={method.id}
                          checked={selectedDelivery === method.id}
                          onChange={(e) => setSelectedDelivery(e.target.value)}
                          disabled={!method.available}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{method.name}</div>
                          <div className="text-sm text-gray-600">{method.description}</div>
                          <div className="text-xs text-gray-500">Estimasi: {method.estimated_days}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(method.price)}
                        </div>
                        {!method.available && (
                          <div className="text-xs text-red-500">Tidak tersedia</div>
                        )}
                      </div>
                    </label>
                  ))}
                  
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      disabled={!selectedDelivery}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Lanjut ke Pembayaran
                    </button>
                  </div>
                </div>
              ) : selectedDelivery ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  {(() => {
                    const method = deliveryMethods.find(m => m.id === selectedDelivery)
                    return method ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-gray-600">{method.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(method.price)}</div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  Silakan pilih metode pengiriman
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">3. Metode Pembayaran</h2>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {currentStep === 3 ? 'Sedang memilih' : 'Edit'}
                </button>
              </div>

              {currentStep === 3 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPayment === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="payment"
                            value={method.id}
                            checked={selectedPayment === method.id}
                            onChange={(e) => setSelectedPayment(e.target.value)}
                            disabled={!method.available}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{method.icon}</span>
                              <div className="font-medium text-gray-900">{method.name}</div>
                            </div>
                            <div className="text-sm text-gray-600">{method.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {method.fee > 0 ? `+${formatCurrency(method.fee)}` : 'Gratis'}
                          </div>
                          {!method.available && (
                            <div className="text-xs text-red-500">Segera hadir</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catatan Pesanan (Opsional)
                    </label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Catatan khusus untuk pesanan ini..."
                    />
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    />
                    <label htmlFor="agree-terms" className="ml-2 text-sm text-gray-600">
                      Saya setuju dengan{' '}
                      <a href="#" className="text-blue-600 hover:text-blue-700">syarat dan ketentuan</a>
                      {' '}serta{' '}
                      <a href="#" className="text-blue-600 hover:text-blue-700">kebijakan privasi</a>
                      {' '}koperasi
                    </label>
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      disabled={!selectedPayment || !agreeTerms || processingOrder}
                      className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {processingOrder ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Memproses...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">💳</span>
                          Buat Pesanan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : selectedPayment ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  {(() => {
                    const method = paymentMethods.find(m => m.id === selectedPayment)
                    return method ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{method.icon}</span>
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-gray-600">{method.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {method.fee > 0 ? `+${formatCurrency(method.fee)}` : 'Gratis'}
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  Silakan pilih metode pembayaran
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Ringkasan Pesanan</h2>

            {/* Cart Items Summary */}
            <div className="space-y-3 mb-6">
              {cartItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.images && item.product.images[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-lg">📦</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.quantity}x {formatCurrency(item.product.discount_price || item.product.member_price)}
                    </div>
                  </div>
                </div>
              ))}
              {cartItems.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{cartItems.length - 3} produk lainnya
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            {cartSummary && (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({cartSummary.total_items} produk)</span>
                  <span>{formatCurrency(cartSummary.subtotal_amount)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-green-600">
                  <span>Hemat Member</span>
                  <span>-{formatCurrency(cartSummary.total_savings)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Ongkir</span>
                  <span>
                    {getDeliveryPrice() > 0 
                      ? formatCurrency(getDeliveryPrice()) 
                      : 'Pilih pengiriman'
                    }
                  </span>
                </div>
                
                {getPaymentFee() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Biaya Pembayaran</span>
                    <span>{formatCurrency(getPaymentFee())}</span>
                  </div>
                )}
                
                {cartSummary.total_weight && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total Berat</span>
                    <span>{formatWeight(cartSummary.total_weight)}</span>
                  </div>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">
                    {formatCurrency(getFinalTotal())}
                  </span>
                </div>
                
                {getFinalTotal() >= 100000 && (
                  <div className="text-xs text-green-600 text-center">
                    🎉 Gratis ongkir untuk pembelian di atas Rp 100.000
                  </div>
                )}
              </div>
            )}

            {/* Security Badge */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="font-medium mb-2 flex items-center">
                  🔒 Transaksi Aman
                </div>
                <ul className="text-xs space-y-1">
                  <li>• Data pembayaran dienkripsi</li>
                  <li>• Garansi uang kembali 100%</li>
                  <li>• Dukungan customer service 24/7</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}