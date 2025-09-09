'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  unit: string
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading] = useState(false)
  const [user, setUser] = useState<{id: string; email?: string} | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadCart()
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCartItems(JSON.parse(savedCart))
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    const updatedCart = cartItems.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    )
    setCartItems(updatedCart)
    localStorage.setItem('cart', JSON.stringify(updatedCart))
  }

  const removeItem = (productId: string) => {
    const updatedCart = cartItems.filter(item => item.product_id !== productId)
    setCartItems(updatedCart)
    localStorage.setItem('cart', JSON.stringify(updatedCart))
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('cart')
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

  const proceedToCheckout = () => {
    if (!user) {
      alert('Silakan login terlebih dahulu untuk melanjutkan checkout')
      router.push('/login')
      return
    }
    router.push('/products/checkout')
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Keranjang Belanja</h1>
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">Keranjang belanja Anda kosong</p>
          <Link 
            href="/products"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Mulai Belanja
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Keranjang Belanja</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              {cartItems.map((item, index) => (
                <div key={item.product_id} className={`${index > 0 ? 'border-t pt-4 mt-4' : ''}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.product_name}</h3>
                      <p className="text-gray-600">
                        {formatCurrency(item.unit_price)} / {item.unit}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-3 rounded"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                          min="1"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-3 rounded"
                        >
                          +
                        </button>
                        <span className="text-gray-600 text-sm">{item.unit}</span>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="text-red-500 hover:text-red-700"
                        title="Hapus dari keranjang"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 px-6 py-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Kosongkan Keranjang
                </button>
                <Link
                  href="/products"
                  className="text-green-600 hover:text-green-700 text-sm"
                >
                  Lanjut Belanja
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Ringkasan Belanja</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartItems.length} produk)</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            
            <button
              onClick={proceedToCheckout}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Memproses...' : 'Lanjut ke Checkout'}
            </button>
            
            {!user && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Silakan login untuk melanjutkan checkout
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}