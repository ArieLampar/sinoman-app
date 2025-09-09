'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, ProductCategory } from '@/types/database.types'
import Link from 'next/link'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('product_name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Katalog Produk</h1>
        <Link 
          href="/products/cart"
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          🛒 Keranjang
        </Link>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Cari produk..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">Semua Kategori</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.category_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{product.product_name}</h3>
              <p className="text-gray-600 text-sm mb-2">SKU: {product.sku}</p>
              <p className="text-gray-600 text-sm mb-3">Stok: {product.stock_quantity} {product.unit}</p>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Harga Member:</span>
                  <span className="font-bold text-green-600">{formatCurrency(product.member_price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Harga Umum:</span>
                  <span className="text-gray-700">{formatCurrency(product.public_price)}</span>
                </div>
              </div>
              
              <Link
                href={`/products/${product.id}`}
                className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center block"
              >
                Lihat Detail
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Tidak ada produk yang ditemukan</p>
        </div>
      )}
    </div>
  )
}