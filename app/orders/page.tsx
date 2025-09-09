'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Order = {
  id: string
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  updated_at: string
  order_items: {
    id: string
    quantity: number
    unit_price: number
    subtotal: number
    product: {
      id: string
      name: string
      images?: string[]
      category: string
    }
  }[]
  order_deliveries?: {
    id: string
    tracking_number?: string
    status: string
    estimated_delivery_date?: string
    actual_delivery_date?: string
  }[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('all')
  const [user, setUser] = useState<any>(null)
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  const orderTabs = [
    { id: 'all', label: 'Semua', count: 0 },
    { id: 'pending', label: 'Menunggu', count: 0 },
    { id: 'paid', label: 'Dibayar', count: 0 },
    { id: 'shipped', label: 'Dikirim', count: 0 },
    { id: 'delivered', label: 'Selesai', count: 0 },
    { id: 'cancelled', label: 'Dibatalkan', count: 0 }
  ]

  useEffect(() => {
    checkAuth()
    fetchOrders()
  }, [selectedTab])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/orders')
      return
    }
    setUser(user)
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '20',
        tenant_id: 'demo-tenant',
        sort: 'created_at',
        order: 'desc'
      })

      if (selectedTab !== 'all') {
        params.append('status', selectedTab)
      }

      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Menunggu Pembayaran',
      'paid': 'Sudah Dibayar',
      'shipped': 'Sedang Dikirim',
      'delivered': 'Selesai',
      'cancelled': 'Dibatalkan'
    }
    return texts[status as keyof typeof texts] || status
  }

  const getPaymentStatusText = (status: string) => {
    const texts = {
      'pending': 'Menunggu',
      'paid': 'Lunas',
      'failed': 'Gagal',
      'refunded': 'Dikembalikan'
    }
    return texts[status as keyof typeof texts] || status
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalItems = (order: Order) => {
    return order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  }

  const orderCounts = orders.reduce((acc, order) => {
    acc.all = (acc.all || 0) + 1
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Diperlukan</h2>
          <p className="text-gray-600 mb-4">Silakan login untuk melihat pesanan Anda</p>
          <Link 
            href="/auth/login?redirect=/orders"
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Pesanan Saya</h1>
            <p className="text-gray-600 mt-2">
              Kelola dan pantau semua pesanan Anda
            </p>
          </div>
          <Link
            href="/marketplace"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Belanja Lagi
          </Link>
        </div>

        {/* Order Status Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-8">
          <div className="flex flex-wrap">
            {orderTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <div className="truncate">
                  {tab.label}
                  {orderCounts[tab.id] > 0 && (
                    <span className="ml-1 text-xs">
                      ({orderCounts[tab.id]})
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">📦</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {selectedTab === 'all' ? 'Belum Ada Pesanan' : `Tidak Ada Pesanan ${orderTabs.find(t => t.id === selectedTab)?.label}`}
            </h2>
            <p className="text-gray-600 mb-8">
              {selectedTab === 'all' 
                ? 'Mulai berbelanja dan buat pesanan pertama Anda'
                : `Tidak ada pesanan dengan status ${orderTabs.find(t => t.id === selectedTab)?.label.toLowerCase()}`
              }
            </p>
            <Link
              href="/marketplace"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold text-gray-900">
                          #{order.order_number}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                          {getPaymentStatusText(order.payment_status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getTotalItems(order)} produk
                      </div>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {order.order_deliveries?.[0] && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-blue-600 mr-2">🚚</span>
                          <div>
                            <div className="text-sm font-medium text-blue-900">
                              {order.order_deliveries[0].tracking_number ? (
                                <>No. Resi: {order.order_deliveries[0].tracking_number}</>
                              ) : (
                                'Sedang diproses'
                              )}
                            </div>
                            {order.order_deliveries[0].estimated_delivery_date && (
                              <div className="text-xs text-blue-700">
                                Estimasi: {formatDate(order.order_deliveries[0].estimated_delivery_date)}
                              </div>
                            )}
                          </div>
                        </div>
                        {order.order_deliveries[0].tracking_number && (
                          <Link
                            href={`/orders/${order.id}/tracking`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Lacak →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.order_items?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product.images?.[0] ? (
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
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.product.category}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-600">
                              {item.quantity}x {formatCurrency(item.unit_price)}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {(order.order_items?.length || 0) > 3 && (
                      <div className="text-center text-sm text-gray-500">
                        +{(order.order_items?.length || 0) - 3} produk lainnya
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-3 flex-wrap">
                      <Link
                        href={`/orders/${order.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Lihat Detail
                      </Link>
                      
                      {order.status === 'pending' && (
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                          Bayar Sekarang
                        </button>
                      )}
                      
                      {order.status === 'delivered' && (
                        <Link
                          href={`/orders/${order.id}/review`}
                          className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                        >
                          Beri Ulasan
                        </Link>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {(order.status === 'pending' || order.status === 'paid') && (
                        <button className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                          Batalkan
                        </button>
                      )}
                      
                      <button className="text-gray-600 hover:text-gray-700 text-sm font-medium px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Hubungi Penjual
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {!loading && orders.length > 0 && orders.length >= 20 && (
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