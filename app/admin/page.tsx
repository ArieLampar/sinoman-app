import { getServerAdminUser } from '@/lib/auth/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface AdminStats {
  totalMembers: number
  activeMembers: number
  totalSavings: number
  totalTransactions: number
  pendingTransactions: number
  totalOrders: number
  totalWasteCollected: number
  revenueThisMonth: number
}

async function getAdminStats(): Promise<AdminStats> {
  const adminUser = await getServerAdminUser()
  if (!adminUser) {
    redirect('/dashboard')
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Get member statistics
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', adminUser.tenant_id)

    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', adminUser.tenant_id)
      .eq('status', 'active')

    // Get savings statistics
    const { data: savingsData } = await supabase
      .from('savings_accounts')
      .select('total_balance')
      .eq('tenant_id', adminUser.tenant_id)

    const totalSavings = savingsData?.reduce((sum, account) => sum + account.total_balance, 0) || 0

    // Get transaction statistics
    const { count: totalTransactions } = await supabase
      .from('savings_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', adminUser.tenant_id)

    // Get pending transactions (if there's a verification system)
    const { count: pendingTransactions } = await supabase
      .from('savings_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', adminUser.tenant_id)
      .is('verified_by', null)

    // Get order statistics
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', adminUser.tenant_id)

    // Get waste collection statistics
    const { data: wasteData } = await supabase
      .from('waste_transactions')
      .select('total_weight_kg')
      .eq('tenant_id', adminUser.tenant_id)

    const totalWasteCollected = wasteData?.reduce((sum, transaction) => sum + transaction.total_weight_kg, 0) || 0

    // Calculate this month's revenue
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('tenant_id', adminUser.tenant_id)
      .eq('payment_status', 'paid')
      .gte('created_at', startOfMonth.toISOString())

    const revenueThisMonth = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

    return {
      totalMembers: totalMembers || 0,
      activeMembers: activeMembers || 0,
      totalSavings,
      totalTransactions: totalTransactions || 0,
      pendingTransactions: pendingTransactions || 0,
      totalOrders: totalOrders || 0,
      totalWasteCollected,
      revenueThisMonth
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return {
      totalMembers: 0,
      activeMembers: 0,
      totalSavings: 0,
      totalTransactions: 0,
      pendingTransactions: 0,
      totalOrders: 0,
      totalWasteCollected: 0,
      revenueThisMonth: 0
    }
  }
}

export default async function AdminDashboardPage() {
  const adminUser = await getServerAdminUser()
  const stats = await getAdminStats()

  if (!adminUser) {
    redirect('/dashboard')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num)
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Selamat Datang, {adminUser.full_name}!</h2>
        <p className="text-blue-100">
          Dashboard admin untuk mengelola Koperasi Sinoman SuperApp
        </p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Anggota</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalMembers)}</p>
              <p className="text-sm text-green-600">
                {stats.activeMembers} aktif
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Simpanan</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalSavings)}</p>
              <p className="text-sm text-gray-500">Semua jenis simpanan</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transaksi</p>
              <p className="text-3xl font-bold text-purple-600">{formatNumber(stats.totalTransactions)}</p>
              <p className="text-sm text-yellow-600">
                {stats.pendingTransactions} menunggu verifikasi
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendapatan Bulan Ini</p>
              <p className="text-3xl font-bold text-orange-600">{formatCurrency(stats.revenueThisMonth)}</p>
              <p className="text-sm text-gray-500">
                {formatNumber(stats.totalOrders)} pesanan
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Sampah</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Sampah Terkumpul</span>
              <span className="font-bold text-green-600">
                {formatNumber(stats.totalWasteCollected)} kg
              </span>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="bg-green-500 rounded-full p-2 mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Program Ramah Lingkungan</p>
                  <p className="font-medium text-gray-900">
                    Kontribusi positif untuk lingkungan
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/admin/members"
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="font-medium">Kelola Anggota</span>
            </a>
            
            <a
              href="/admin/transactions"
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Verifikasi Transaksi</span>
            </a>
            
            <a
              href="/admin/reports"
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Lihat Laporan</span>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
        <div className="space-y-4">
          {stats.pendingTransactions > 0 && (
            <div className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.734 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-900">
                  Ada {stats.pendingTransactions} transaksi yang perlu diverifikasi
                </p>
                <p className="text-sm text-yellow-700">
                  Segera proses untuk menjaga kelancaran sistem
                </p>
              </div>
            </div>
          )}

          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Log aktivitas akan ditampilkan di sini</p>
          </div>
        </div>
      </div>
    </div>
  )
}