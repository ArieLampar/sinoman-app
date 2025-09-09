'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import Image from 'next/image'

type Product = Database['public']['Tables']['products']['Row'] & {
  member?: {
    full_name: string
    avatar_url?: string
  }
  rating_count: number
  in_stock: boolean
  discount_percentage: number
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{name: string, slug: string, count?: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({min: '', max: ''})
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [selectedCategory, sortBy])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/products/categories?with_counts=true&tenant_id=demo-tenant')
      const data = await response.json()
      
      if (data.success) {
        setCategories([{name: 'Semua', slug: 'all'}, ...data.data])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '20',
        tenant_id: 'demo-tenant'
      })

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      if (sortBy) {
        const [sort, order] = sortBy.split('_')
        params.append('sort', sort)
        params.append('order', order || 'desc')
      }

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchProducts()
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20',
        tenant_id: 'demo-tenant'
      })

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      if (priceRange.min) params.append('min_price', priceRange.min)
      if (priceRange.max) params.append('max_price', priceRange.max)

      const response = await fetch(`/api/products/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error searching products:', error)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛒 Marketplace Koperasi
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Produk berkualitas dari sesama anggota koperasi dengan harga khusus member
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="md:col-span-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name} {category.count && `(${category.count})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="md:col-span-2">
              <input
                type="number"
                placeholder="Harga min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="number"
                placeholder="Harga max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Search Button */}
            <div className="md:col-span-1">
              <button
                onClick={handleSearch}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cari
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 font-medium">Urutkan:</span>
            {[
              {value: 'newest', label: 'Terbaru'},
              {value: 'price_asc', label: 'Harga Terendah'},
              {value: 'price_desc', label: 'Harga Tertinggi'},
              {value: 'rating_desc', label: 'Rating Tertinggi'},
              {value: 'popular', label: 'Terlaris'},
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  sortBy === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-w-1 aspect-h-1 w-full h-48 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Tidak ada produk ditemukan
            </h3>
            <p className="text-gray-600 mb-4">
              Coba ubah kata kunci pencarian atau filter yang Anda gunakan
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setPriceRange({min: '', max: ''})
                fetchProducts()
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Tampilkan Semua Produk
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link href={`/marketplace/products/${product.id}`} key={product.id}>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                  {/* Product Image */}
                  <div className="relative aspect-w-1 aspect-h-1 w-full h-48 bg-gray-100">
                    {product.images && product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-4xl">📦</span>
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.featured && (
                        <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-medium">
                          ⭐ Featured
                        </span>
                      )}
                      {product.discount_percentage > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          -{product.discount_percentage}%
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="absolute top-2 right-2">
                      {product.in_stock ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Stok: {product.stock_quantity}
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Habis
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-600 font-medium">
                        {product.category}
                      </span>
                      {product.average_rating > 0 && (
                        <div className="flex items-center">
                          <span className="text-yellow-400 text-sm">★</span>
                          <span className="text-xs text-gray-600 ml-1">
                            {product.average_rating.toFixed(1)} ({product.rating_count})
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>

                    {/* Seller Info */}
                    {product.member && (
                      <div className="flex items-center mb-3">
                        <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                          {product.member.avatar_url ? (
                            <Image
                              src={product.member.avatar_url}
                              alt={product.member.full_name}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          ) : (
                            <span className="text-xs">👤</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 truncate">
                          {product.member.full_name}
                        </span>
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-lg text-green-600">
                            {formatCurrency(product.discount_price || product.member_price)}
                          </div>
                          {product.discount_price && (
                            <div className="text-sm text-gray-500 line-through">
                              {formatCurrency(product.member_price)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Harga Umum</div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(product.public_price)}
                          </div>
                        </div>
                      </div>
                      
                      {product.public_price > (product.discount_price || product.member_price) && (
                        <div className="text-xs text-green-600 font-medium">
                          Hemat {formatCurrency(product.public_price - (product.discount_price || product.member_price))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      {product.in_stock ? (
                        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                          Lihat Detail
                        </button>
                      ) : (
                        <button disabled className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed text-sm font-medium">
                          Stok Habis
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && products.length > 0 && (
          <div className="text-center mt-8">
            <button className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              Muat Lebih Banyak
            </button>
          </div>
        )}
      </div>
    </div>
  )
}