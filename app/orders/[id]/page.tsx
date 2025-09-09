'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem, Member } from '@/types/database.types'
import Link from 'next/link'

interface OrderDetail extends Order {
  order_items: OrderItem[]
  member: Member
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail()
    }
  }, [params.id])

  const fetchOrderDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          member:members (*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setOrder(data as OrderDetail)
    } catch (error) {
      console.error('Error fetching order:', error)
      router.push('/orders')
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
      <span className={`px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>
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
      <span className={`px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'Tunai',
      bank_transfer: 'Transfer Bank',
      savings_transfer: 'Potong Simpanan'
    }
    return methods[method as keyof typeof methods] || method
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Pesanan tidak ditemukan</p>
        <div className="text-center mt-4">
          <Link href="/orders" className="text-green-600 hover:underline">
            Kembali ke Riwayat Pesanan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/orders" className="text-green-600 hover:underline mb-6 inline-block">
        ← Kembali ke Riwayat Pesanan
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{order.order_number}</h1>
            <p className="text-gray-600">{formatDate(order.order_date)}</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            {getStatusBadge(order.order_status)}
            {getPaymentBadge(order.payment_status)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Informasi Pembeli</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-gray-600">Nama:</span>
                <p className="font-medium">{order.member.full_name}</p>
              </div>
              <div>
                <span className="text-gray-600">No. Anggota:</span>
                <p className="font-medium">{order.member.member_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Telepon:</span>
                <p className="font-medium">{order.member.phone || '-'}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium">{order.member.email || '-'}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Informasi Pembayaran</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-gray-600">Metode Pembayaran:</span>
                <p className="font-medium">{getPaymentMethodLabel(order.payment_method)}</p>
              </div>
              <div>
                <span className="text-gray-600">Status Pembayaran:</span>
                <p className="font-medium">
                  {order.payment_status === 'paid' ? 'Lunas' : 
                   order.payment_status === 'pending' ? 'Belum Bayar' :
                   order.payment_status === 'failed' ? 'Gagal' : 'Refund'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Total Pembayaran:</span>
                <p className="text-xl font-bold text-green-600">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Detail Produk</h2>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-4">Produk</th>
                  <th className="text-center p-4">Jumlah</th>
                  <th className="text-right p-4">Harga Satuan</th>
                  <th className="text-right p-4">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item, index) => (
                  <tr key={item.id} className={index > 0 ? 'border-t' : ''}>
                    <td className="p-4">
                      <p className="font-medium">{item.product_name}</p>
                    </td>
                    <td className="text-center p-4">{item.quantity}</td>
                    <td className="text-right p-4">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right p-4 font-medium">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan={3} className="text-right p-4 font-semibold">Subtotal:</td>
                  <td className="text-right p-4 font-semibold">{formatCurrency(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right p-4 font-semibold">Total:</td>
                  <td className="text-right p-4 text-xl font-bold text-green-600">
                    {formatCurrency(order.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {order.order_status === 'pending' && order.payment_status === 'pending' && (
          <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Menunggu Pembayaran</h3>
            <p className="text-yellow-700">
              Silakan lakukan pembayaran sesuai dengan metode yang dipilih untuk memproses pesanan Anda.
            </p>
          </div>
        )}

        {order.order_status === 'delivered' && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Pesanan Selesai</h3>
            <p className="text-green-700">
              Terima kasih telah berbelanja! Pesanan Anda telah selesai.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}