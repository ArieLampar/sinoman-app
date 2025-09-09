'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem } from '@/types/database.types'
import Link from 'next/link'

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'>('all')
  
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!memberData) return

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('member_id', memberData.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Menunggu' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Dikonfirmasi' },
      shipped: { color: 'bg-purple-100 text-purple-800', label: 'Dikirim' },
      delivered: { color: 'bg-green-100 text-green-800', label: 'Selesai' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Dibatalkan' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Belum Bayar' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Lunas' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Gagal' },
      refunded: { color: 'bg-gray-100 text-gray-800', label: 'Refund' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.order_status === filter)

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
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Pesanan</h1>
        <Link 
          href="/products"
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Belanja Lagi
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status as typeof filter)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Semua' : 
               status === 'pending' ? 'Menunggu' :
               status === 'confirmed' ? 'Dikonfirmasi' :
               status === 'shipped' ? 'Dikirim' :
               status === 'delivered' ? 'Selesai' : 'Dibatalkan'}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">Belum ada pesanan</p>
          <Link 
            href="/products"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{order.order_number}</h3>
                  <p className="text-gray-600 text-sm">{formatDate(order.order_date)}</p>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  {getStatusBadge(order.order_status)}
                  {getPaymentBadge(order.payment_status)}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  {order.order_items.slice(0, 2).map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                  {order.order_items.length > 2 && (
                    <p className="text-sm text-gray-500">
                      +{order.order_items.length - 2} produk lainnya
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t mt-4 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <p className="text-gray-600 text-sm">Total Pembayaran</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(order.total_amount)}</p>
                </div>
                <Link
                  href={`/orders/${order.id}`}
                  className="mt-4 md:mt-0 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}