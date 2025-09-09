'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

type ProductDetail = Database['public']['Tables']['products']['Row'] & {
  member?: {
    id: string
    full_name: string
    avatar_url?: string
    phone?: string
    address?: string
  }
  product_reviews?: Array<{
    id: string
    rating: number
    comment: string
    created_at: string
    member?: {
      full_name: string
      avatar_url?: string
    }
  }>
  rating_count: number
  in_stock: boolean
  discount_percentage: number
  recent_reviews: any[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'seller'>('description')
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
    }
  }, [params.id])

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()
      
      if (data.success) {
        setProduct(data.data)
      } else {
        // Product not found, redirect to marketplace
        router.push('/marketplace')
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      router.push('/marketplace')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    try {
      setAddingToCart(true)
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product?.id,
          quantity: quantity,
          tenant_id: 'demo-tenant'
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Show success message or redirect to cart
        alert('Produk berhasil ditambahkan ke keranjang!')
      } else {
        alert(data.error || 'Gagal menambahkan ke keranjang')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('Gagal menambahkan ke keranjang')
    } finally {
      setAddingToCart(false)
    }
  }

  const buyNow = async () => {
    await addToCart()
    router.push('/cart')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-w-1 aspect-h-1 w-full h-96 bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Marketplace</Link>
          <span>›</span>
          <Link href={`/marketplace?category=${product.category}`} className="hover:text-blue-600">
            {product.category}
          </Link>
          <span>›</span>
          <span className="text-gray-900 font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-w-1 aspect-h-1 w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
              {product.images && product.images[selectedImageIndex] ? (
                <Image
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-6xl">📦</span>
                </div>
              )}
            </div>
            
            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                  {product.category}
                </span>
                {product.featured && (
                  <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium">
                    ⭐ Featured
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              
              {/* Rating */}
              {product.average_rating > 0 && (
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.average_rating) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {product.average_rating.toFixed(1)} ({product.rating_count} ulasan)
                  </span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(product.discount_price || product.member_price)}
                    </div>
                    {product.discount_price && (
                      <div className="text-lg text-gray-500 line-through">
                        {formatCurrency(product.member_price)}
                      </div>
                    )}
                    <div className="text-sm text-green-600 font-medium">
                      Harga Member
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg text-gray-600">
                      {formatCurrency(product.public_price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Harga Umum
                    </div>
                    {product.public_price > (product.discount_price || product.member_price) && (
                      <div className="text-sm text-green-600 font-medium">
                        Hemat {formatCurrency(product.public_price - (product.discount_price || product.member_price))}
                      </div>
                    )}
                  </div>
                </div>
                
                {product.discount_percentage > 0 && (
                  <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-center font-medium">
                    🔥 Diskon {product.discount_percentage}% - Terbatas!
                  </div>
                )}
              </div>
            </div>

            {/* Stock and Quantity */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Stok tersedia:</span>
                <span className={`text-sm font-medium ${product.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                  {product.in_stock ? `${product.stock_quantity} pcs` : 'Habis'}
                </span>
              </div>

              {product.in_stock && (
                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-sm text-gray-600">Jumlah:</span>
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={product.min_order_quantity || 1}
                      max={product.stock_quantity}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setQuantity(Math.max(product.min_order_quantity || 1, Math.min(product.stock_quantity, val)))
                      }}
                      className="w-16 text-center py-2 border-0 focus:ring-0"
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  {product.min_order_quantity && product.min_order_quantity > 1 && (
                    <span className="text-xs text-gray-500">
                      Min. order: {product.min_order_quantity}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={addToCart}
                  disabled={!product.in_stock || addingToCart}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    product.in_stock && !addingToCart
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {addingToCart ? 'Menambahkan...' : '🛒 Keranjang'}
                </button>
                <button
                  onClick={buyNow}
                  disabled={!product.in_stock || addingToCart}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    product.in_stock && !addingToCart
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ⚡ Beli Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'description', label: 'Deskripsi', icon: '📋' },
                { id: 'reviews', label: `Ulasan (${product.rating_count})`, icon: '⭐' },
                { id: 'seller', label: 'Penjual', icon: '👤' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {product.description || 'Tidak ada deskripsi tersedia.'}
                </p>
                
                {product.tags && product.tags.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.weight_grams && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">Berat:</h4>
                    <p className="text-gray-600">{product.weight_grams} gram</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {product.recent_reviews && product.recent_reviews.length > 0 ? (
                  product.recent_reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                            {review.member?.avatar_url ? (
                              <Image
                                src={review.member.avatar_url}
                                alt={review.member.full_name}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            ) : (
                              <span className="text-sm">👤</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {review.member?.full_name || 'Anonim'}
                            </div>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-gray-500">Belum ada ulasan untuk produk ini</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seller' && product.member && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {product.member.avatar_url ? (
                      <Image
                        src={product.member.avatar_url}
                        alt={product.member.full_name}
                        width={64}
                        height={64}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {product.member.full_name}
                    </h3>
                    <p className="text-gray-600">Anggota Koperasi</p>
                  </div>
                </div>

                {product.member.phone && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">📞</span>
                    <span>{product.member.phone}</span>
                  </div>
                )}

                {product.member.address && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">📍</span>
                    <span>{product.member.address}</span>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/marketplace?seller_id=${product.member.id}`}
                    className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Lihat Produk Lainnya
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}