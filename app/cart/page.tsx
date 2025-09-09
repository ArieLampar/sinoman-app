'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type CartItem = {
  id: string
  quantity: number
  created_at: string
  product: {
    id: string
    name: string
    member_price: number
    public_price: number
    discount_price?: number
    stock_quantity: number
    images?: string[]
    category: string
    weight_grams: number
    seller_id: string
    member?: {
      full_name: string
      avatar_url?: string
    }
  }
}

type CartSummary = {
  total_items: number
  subtotal_amount: number
  total_savings: number
  estimated_shipping: number
  total_amount: number
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCartItems()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/cart')
      return
    }
    setUser(user)
  }

  const fetchCartItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cart?tenant_id=demo-tenant')
      const data = await response.json()
      
      if (data.success) {
        setCartItems(data.data.items || [])
        setCartSummary(data.data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      setUpdatingItem(itemId)
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          quantity: newQuantity,
          tenant_id: 'demo-tenant'
        }),
      })
      
      const data = await response.json()
      if (data.success) {
        fetchCartItems() // Refresh cart
      } else {
        alert(data.error || 'Gagal memperbarui kuantitas')
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      alert('Terjadi kesalahan saat memperbarui kuantitas')
    } finally {
      setUpdatingItem(null)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!confirm('Yakin ingin menghapus produk ini dari keranjang?')) return

    try {
      setRemovingItem(itemId)
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          tenant_id: 'demo-tenant'
        }),
      })
      
      const data = await response.json()
      if (data.success) {
        fetchCartItems() // Refresh cart
      } else {
        alert(data.error || 'Gagal menghapus produk')
      }
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Terjadi kesalahan saat menghapus produk')
    } finally {
      setRemovingItem(null)
    }
  }

  const clearCart = async () => {
    if (!confirm('Yakin ingin mengosongkan keranjang belanja?')) return

    try {
      setLoading(true)
      const response = await fetch('/api/cart/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'demo-tenant' }),
      })
      
      const data = await response.json()
      if (data.success) {
        setCartItems([])
        setCartSummary(null)
      } else {
        alert(data.error || 'Gagal mengosongkan keranjang')
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      alert('Terjadi kesalahan saat mengosongkan keranjang')
    } finally {
      setLoading(false)
    }
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Diperlukan</h2>
          <p className="text-gray-600 mb-4">Silakan login untuk melihat keranjang belanja Anda</p>
          <Link 
            href="/auth/login?redirect=/cart"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛒 Keranjang Belanja</h1>
            <p className="text-gray-600 mt-2">
              {cartItems.length > 0 
                ? `${cartItems.length} produk dalam keranjang Anda`
                : 'Keranjang belanja kosong'
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/marketplace"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Lanjut Belanja
            </Link>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
              >
                Kosongkan Keranjang
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg animate-pulse">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="w-24 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Skeleton */}
            <div className="bg-white rounded-lg shadow-sm p-6 h-fit animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
              <div className="h-12 bg-gray-200 rounded mt-6"></div>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Keranjang Belanja Kosong
            </h2>
            <p className="text-gray-600 mb-8">
              Mulai belanja dan tambahkan produk favorit Anda ke keranjang
            </p>
            <Link
              href="/marketplace"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Produk dalam Keranjang</h2>
                
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.images && item.product.images[0] ? (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-2xl">📦</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          Kategori: {item.product.category}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Berat: {formatWeight(item.product.weight_grams * item.quantity)}
                        </p>

                        {/* Seller Info */}
                        {item.product.member && (
                          <div className="flex items-center mb-2">
                            <div className="w-4 h-4 bg-gray-200 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
                              {item.product.member.avatar_url ? (
                                <Image
                                  src={item.product.member.avatar_url}
                                  alt={item.product.member.full_name}
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                              ) : (
                                <span className="text-xs">👤</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 truncate">
                              {item.product.member.full_name}
                            </span>
                          </div>
                        )}

                        {/* Pricing */}
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-green-600">
                            {formatCurrency(item.product.discount_price || item.product.member_price)}
                          </div>
                          {item.product.discount_price && (
                            <div className="text-sm text-gray-500 line-through">
                              {formatCurrency(item.product.member_price)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            vs {formatCurrency(item.product.public_price)} (umum)
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingItem === item.id}
                            className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-lg">-</span>
                          </button>
                          <span className="px-4 py-2 min-w-[3rem] text-center">
                            {updatingItem === item.id ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity || updatingItem === item.id}
                            className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-lg">+</span>
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right min-w-[6rem]">
                          <div className="font-bold text-lg">
                            {formatCurrency((item.product.discount_price || item.product.member_price) * item.quantity)}
                          </div>
                          <div className="text-xs text-green-600">
                            Hemat {formatCurrency((item.product.public_price - (item.product.discount_price || item.product.member_price)) * item.quantity)}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={removingItem === item.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus dari keranjang"
                        >
                          {removingItem === item.id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Ringkasan Belanja</h2>
              
              {cartSummary && (
                <div className="space-y-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cartSummary.total_items} produk)</span>
                    <span>{formatCurrency(cartSummary.subtotal_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between text-green-600">
                    <span>Hemat Member</span>
                    <span>-{formatCurrency(cartSummary.total_savings)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Estimasi Ongkir</span>
                    <span>{formatCurrency(cartSummary.estimated_shipping)}</span>
                  </div>
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(cartSummary.total_amount)}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center">
                    Gratis ongkir untuk pembelian di atas Rp 100.000
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                <Link
                  href="/checkout"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center block"
                >
                  Lanjut ke Checkout
                </Link>
                
                <button
                  onClick={() => router.push('/marketplace')}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Lanjut Belanja
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">🛡️ Jaminan Koperasi</div>
                  <ul className="text-xs space-y-1">
                    <li>• Produk berkualitas dari sesama member</li>
                    <li>• Harga khusus member koperasi</li>
                    <li>• Dukungan penuh tim customer service</li>
                    <li>• Garansi kepuasan 100%</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}