'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  notifyWelcomeMember,
  notifySavingsDeposit,
  notifyOrderStatus,
  notifyWasteTransaction,
  createNotification
} from '@/lib/notifications/actions'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function TestNotificationsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleTestNotification = async (type: string) => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('User tidak ditemukan. Silakan login terlebih dahulu.')
        setIsLoading(false)
        return
      }

      switch (type) {
        case 'welcome':
          await notifyWelcomeMember(user.id, 'Test User')
          setMessage('Notifikasi selamat datang berhasil dikirim!')
          break
          
        case 'savings':
          await notifySavingsDeposit(user.id, 100000, 'Sukarela', 'TRX-TEST-001')
          setMessage('Notifikasi setoran simpanan berhasil dikirim!')
          break
          
        case 'order':
          await notifyOrderStatus(user.id, 'ORD-TEST-001', 'confirmed', 'Dikonfirmasi')
          setMessage('Notifikasi status pesanan berhasil dikirim!')
          break
          
        case 'waste':
          await notifyWasteTransaction(user.id, 'WB-TEST-001', 5.5, 25000)
          setMessage('Notifikasi transaksi bank sampah berhasil dikirim!')
          break
          
        case 'custom':
          await createNotification({
            recipientId: user.id,
            title: 'Notifikasi Test Custom',
            message: 'Ini adalah notifikasi test custom yang dikirim pada ' + new Date().toLocaleString('id-ID'),
            type: 'info',
            category: 'test',
            actionUrl: '/dashboard'
          })
          setMessage('Notifikasi custom berhasil dikirim!')
          break
          
        case 'multiple':
          // Send multiple notifications at once
          await Promise.all([
            createNotification({
              recipientId: user.id,
              title: 'Notifikasi 1',
              message: 'Ini adalah notifikasi pertama',
              type: 'info'
            }),
            createNotification({
              recipientId: user.id,
              title: 'Notifikasi 2',
              message: 'Ini adalah notifikasi kedua',
              type: 'success'
            }),
            createNotification({
              recipientId: user.id,
              title: 'Notifikasi 3',
              message: 'Ini adalah notifikasi ketiga',
              type: 'warning'
            })
          ])
          setMessage('3 notifikasi berhasil dikirim sekaligus!')
          break
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      setMessage('Gagal mengirim notifikasi: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Test Real-time Notifications</h1>
        <p className="text-gray-600">
          Halaman ini untuk testing sistem notifikasi real-time. Klik tombol di bawah untuk mengirim notifikasi test.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('berhasil') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Kirim Notifikasi Test</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleTestNotification('welcome')}
            disabled={isLoading}
            className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Welcome Member
          </button>

          <button
            onClick={() => handleTestNotification('savings')}
            disabled={isLoading}
            className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Savings Deposit
          </button>

          <button
            onClick={() => handleTestNotification('order')}
            disabled={isLoading}
            className="p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Order Status
          </button>

          <button
            onClick={() => handleTestNotification('waste')}
            disabled={isLoading}
            className="p-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Waste Transaction
          </button>

          <button
            onClick={() => handleTestNotification('custom')}
            disabled={isLoading}
            className="p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Custom Notification
          </button>

          <button
            onClick={() => handleTestNotification('multiple')}
            disabled={isLoading}
            className="p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Multiple Notifications
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Cara Test:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Pastikan Anda sudah login</li>
            <li>Buka dashboard di tab/window lain untuk melihat notification bell</li>
            <li>Klik salah satu tombol di atas untuk mengirim notifikasi</li>
            <li>Notifikasi akan muncul real-time di bell icon</li>
            <li>Browser notification akan muncul jika diizinkan</li>
          </ol>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Ke Dashboard
          </button>
          <button
            onClick={() => router.push('/notifications')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Lihat Semua Notifikasi
          </button>
        </div>
      </div>
    </div>
  )
}