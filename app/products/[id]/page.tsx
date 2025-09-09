'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Product, ProductCategory } from '@/types/database.types'
import Link from 'next/link'

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  unit: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single()

      if (productError) throw productError
      setProduct(productData)

      if (productData?.category_id) {
        const { data: categoryData } = await supabase
          .from('product_categories')
          .select('*')
          .eq('id', productData.category_id)
          .single()
        
        setCategory(categoryData)
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      router.push('/products')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    if (!product) return
    
    setAdding(true)
    try {
      const existingCart = localStorage.getItem('cart')
      const cart = existingCart ? JSON.parse(existingCart) : []
      
      const existingItem = cart.find((item: CartItem) => item.product_id === product.id)
      
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        cart.push({
          product_id: product.id,
          product_name: product.product_name,
          unit_price: product.member_price,
          quantity: quantity,
          unit: product.unit
        })
      }
      
      localStorage.setItem('cart', JSON.stringify(cart))
      
      alert('Produk berhasil ditambahkan ke keranjang!')
      router.push('/products/cart')
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('Gagal menambahkan produk ke keranjang')
    } finally {
      setAdding(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Produk tidak ditemukan</p>
        <div className="text-center mt-4">
          <Link href="/products" className="text-green-600 hover:underline">
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/products" className="text-green-600 hover:underline mb-6 inline-block">
        ← Kembali ke Katalog
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.product_name}</h1>
            
            {category && (
              <p className="text-gray-600 mb-2">
                Kategori: <span className="font-semibold">{category.category_name}</span>
              </p>
            )}
            
            <p className="text-gray-600 mb-2">SKU: {product.sku}</p>
            <p className="text-gray-600 mb-4">Satuan: {product.unit}</p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Informasi Harga</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Harga Modal:</span>
                  <span className="font-medium">{formatCurrency(product.cost_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Harga Member:</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(product.member_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Harga Umum:</span>
                  <span className="font-medium">{formatCurrency(product.public_price)}</span>
                </div>
              </div>
            </div>

            {product.nutritional_info && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-2">Informasi Nutrisi</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(product.nutritional_info, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4">Pembelian</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Stok Tersedia:</p>
                <p className="text-2xl font-bold text-green-600">
                  {product.stock_quantity} {product.unit}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Pembelian
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock_quantity, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center border border-gray-300 rounded-lg px-2 py-2"
                    min="1"
                    max={product.stock_quantity}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded"
                    disabled={quantity >= product.stock_quantity}
                  >
                    +
                  </button>
                  <span className="text-gray-600">{product.unit}</span>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center text-lg">
                  <span>Total Harga:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(product.member_price * quantity)}
                  </span>
                </div>
              </div>

              <button
                onClick={addToCart}
                disabled={adding || product.stock_quantity === 0}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {adding ? 'Menambahkan...' : 
                 product.stock_quantity === 0 ? 'Stok Habis' : 
                 '🛒 Tambah ke Keranjang'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}