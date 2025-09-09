'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FinancialReport {
  period: string
  totalMembers: number
  activeMembers: number
  totalSavings: number
  totalTransactions: number
  totalRevenue: number
  totalOrders: number
  totalWasteCollected: number
  memberGrowth: number
  savingsGrowth: number
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  
  const supabase = createClient()

  useEffect(() => {
    generateReport()
  }, [reportType, selectedPeriod])

  const generateReport = async () => {
    try {
      setLoading(true)
      
      const [year, month] = selectedPeriod.split('-')
      let startDate: Date
      let endDate: Date
      let prevStartDate: Date
      let prevEndDate: Date

      if (reportType === 'monthly') {
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
        prevStartDate = new Date(parseInt(year), parseInt(month) - 2, 1)
        prevEndDate = new Date(parseInt(year), parseInt(month) - 1, 0, 23, 59, 59)
      } else {
        startDate = new Date(parseInt(year), 0, 1)
        endDate = new Date(parseInt(year), 11, 31, 23, 59, 59)
        prevStartDate = new Date(parseInt(year) - 1, 0, 1)
        prevEndDate = new Date(parseInt(year) - 1, 11, 31, 23, 59, 59)
      }

      // Get current period data
      const [
        membersData,
        activeMembersData,
        savingsData,
        transactionsData,
        ordersData,
        wasteData
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).lte('created_at', endDate.toISOString()),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active').lte('created_at', endDate.toISOString()),
        supabase.from('savings_accounts').select('total_balance'),
        supabase.from('savings_transactions').select('amount').gte('transaction_date', startDate.toISOString()).lte('transaction_date', endDate.toISOString()),
        supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('waste_transactions').select('total_weight_kg').gte('transaction_date', startDate.toISOString()).lte('transaction_date', endDate.toISOString())
      ])

      // Get previous period data for growth calculation
      const [
        prevMembersData,
        prevSavingsTransactionsData
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).lte('created_at', prevEndDate.toISOString()),
        supabase.from('savings_transactions').select('amount').gte('transaction_date', prevStartDate.toISOString()).lte('transaction_date', prevEndDate.toISOString())
      ])

      const currentMembers = membersData.count || 0
      const activeMembers = activeMembersData.count || 0
      const totalSavings = savingsData.data?.reduce((sum, account) => sum + account.total_balance, 0) || 0
      const totalTransactions = transactionsData.data?.length || 0
      const totalRevenue = ordersData.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0
      const totalOrders = ordersData.data?.length || 0
      const totalWasteCollected = wasteData.data?.reduce((sum, transaction) => sum + transaction.total_weight_kg, 0) || 0

      const prevMembers = prevMembersData.count || 0
      const prevTransactionAmount = prevSavingsTransactionsData.data?.reduce((sum, t) => sum + t.amount, 0) || 0
      const currentTransactionAmount = transactionsData.data?.reduce((sum, t) => sum + t.amount, 0) || 0

      const memberGrowth = prevMembers > 0 ? ((currentMembers - prevMembers) / prevMembers) * 100 : 0
      const savingsGrowth = prevTransactionAmount > 0 ? ((currentTransactionAmount - prevTransactionAmount) / prevTransactionAmount) * 100 : 0

      setReport({
        period: selectedPeriod,
        totalMembers: currentMembers,
        activeMembers,
        totalSavings,
        totalTransactions,
        totalRevenue,
        totalOrders,
        totalWasteCollected,
        memberGrowth,
        savingsGrowth
      })
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!report) return

    const csvContent = `
Laporan Keuangan Koperasi Sinoman SuperApp
Periode: ${report.period} (${reportType === 'monthly' ? 'Bulanan' : 'Tahunan'})
Tanggal Generate: ${new Date().toLocaleString('id-ID')}

RINGKASAN KEANGGOTAAN:
Total Anggota: ${report.totalMembers}
Anggota Aktif: ${report.activeMembers}
Pertumbuhan Anggota: ${report.memberGrowth.toFixed(2)}%

RINGKASAN KEUANGAN:
Total Simpanan: ${formatCurrency(report.totalSavings)}
Total Transaksi: ${report.totalTransactions}
Pertumbuhan Simpanan: ${report.savingsGrowth.toFixed(2)}%

RINGKASAN E-COMMERCE:
Total Pesanan: ${report.totalOrders}
Total Pendapatan: ${formatCurrency(report.totalRevenue)}

RINGKASAN BANK SAMPAH:
Total Sampah Terkumpul: ${report.totalWasteCollected.toFixed(2)} kg
`

    const blob = new Blob([csvContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-${reportType}-${report.period}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
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

  const formatPercentage = (num: number) => {
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Laporan & Analitik</h1>
        <button
          onClick={exportReport}
          disabled={!report}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          📄 Export Laporan
        </button>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periode
            </label>
            <input
              type={reportType === 'monthly' ? 'month' : 'number'}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={reportType === 'yearly' ? '2020' : undefined}
              max={reportType === 'yearly' ? new Date().getFullYear().toString() : undefined}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Update Laporan
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Anggota</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(report.totalMembers)}</p>
                  <p className={`text-sm ${report.memberGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(report.memberGrowth)} vs periode sebelumnya
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Simpanan</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(report.totalSavings)}</p>
                  <p className={`text-sm ${report.savingsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(report.savingsGrowth)} aktivitas transaksi
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendapatan E-Commerce</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(report.totalRevenue)}</p>
                  <p className="text-sm text-gray-500">{formatNumber(report.totalOrders)} pesanan</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sampah Terkumpul</p>
                  <p className="text-2xl font-bold text-purple-600">{report.totalWasteCollected.toFixed(1)} kg</p>
                  <p className="text-sm text-gray-500">Program ramah lingkungan</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Membership Analysis */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analisis Keanggotaan</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Anggota</span>
                  <span className="font-semibold">{formatNumber(report.totalMembers)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Anggota Aktif</span>
                  <span className="font-semibold text-green-600">{formatNumber(report.activeMembers)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tingkat Keaktifan</span>
                  <span className="font-semibold">
                    {((report.activeMembers / report.totalMembers) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pertumbuhan Anggota</span>
                  <span className={`font-semibold ${report.memberGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(report.memberGrowth)}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Insight</h4>
                <p className="text-blue-800 text-sm">
                  {report.memberGrowth > 0 
                    ? `Pertumbuhan anggota positif ${formatPercentage(report.memberGrowth)} menunjukkan koperasi berkembang dengan baik.`
                    : report.memberGrowth < -5
                    ? 'Perlu perhatian: terjadi penurunan anggota yang signifikan. Evaluasi program dan layanan diperlukan.'
                    : 'Pertumbuhan anggota stabil. Pertimbangkan program perekrutan untuk meningkatkan partisipasi.'}
                </p>
              </div>
            </div>

            {/* Financial Analysis */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analisis Keuangan</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Simpanan</span>
                  <span className="font-semibold">{formatCurrency(report.totalSavings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Transaksi</span>
                  <span className="font-semibold">{formatNumber(report.totalTransactions)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rata-rata per Anggota</span>
                  <span className="font-semibold">
                    {report.totalMembers > 0 ? formatCurrency(report.totalSavings / report.totalMembers) : 'Rp 0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Aktivitas Transaksi</span>
                  <span className={`font-semibold ${report.savingsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(report.savingsGrowth)}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Insight</h4>
                <p className="text-green-800 text-sm">
                  {report.savingsGrowth > 10 
                    ? `Aktivitas simpanan sangat baik dengan pertumbuhan ${formatPercentage(report.savingsGrowth)}.`
                    : report.savingsGrowth > 0
                    ? `Pertumbuhan simpanan positif ${formatPercentage(report.savingsGrowth)}. Terus tingkatkan program simpanan.`
                    : 'Aktivitas simpanan menurun. Perlu strategi untuk meningkatkan partisipasi anggota dalam program simpanan.'}
                </p>
              </div>
            </div>
          </div>

          {/* Business Performance */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Performa Bisnis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* E-Commerce */}
              <div className="text-center">
                <div className="bg-orange-100 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">E-Commerce</h4>
                <p className="text-2xl font-bold text-orange-600 mb-1">{formatCurrency(report.totalRevenue)}</p>
                <p className="text-sm text-gray-600">{formatNumber(report.totalOrders)} pesanan</p>
                <p className="text-xs text-gray-500 mt-2">
                  {report.totalOrders > 0 
                    ? `Rata-rata: ${formatCurrency(report.totalRevenue / report.totalOrders)} per pesanan`
                    : 'Belum ada pesanan'
                  }
                </p>
              </div>

              {/* Waste Bank */}
              <div className="text-center">
                <div className="bg-green-100 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Bank Sampah</h4>
                <p className="text-2xl font-bold text-green-600 mb-1">{report.totalWasteCollected.toFixed(1)} kg</p>
                <p className="text-sm text-gray-600">Sampah terkumpul</p>
                <p className="text-xs text-gray-500 mt-2">
                  {report.activeMembers > 0 
                    ? `Rata-rata: ${(report.totalWasteCollected / report.activeMembers).toFixed(1)} kg per anggota aktif`
                    : 'Belum ada kontribusi'
                  }
                </p>
              </div>

              {/* Savings Activity */}
              <div className="text-center">
                <div className="bg-blue-100 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Aktivitas Simpanan</h4>
                <p className="text-2xl font-bold text-blue-600 mb-1">{formatNumber(report.totalTransactions)}</p>
                <p className="text-sm text-gray-600">Total transaksi</p>
                <p className="text-xs text-gray-500 mt-2">
                  {report.activeMembers > 0 
                    ? `Rata-rata: ${(report.totalTransactions / report.activeMembers).toFixed(1)} transaksi per anggota aktif`
                    : 'Belum ada aktivitas'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rekomendasi Strategis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📈 Peningkatan Keanggotaan</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {report.memberGrowth < 5 && <li>• Luncurkan program referral dengan insentif</li>}
                  <li>• Tingkatkan sosialisasi manfaat koperasi</li>
                  <li>• Kembangkan program komunitas lokal</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">💰 Optimasi Keuangan</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {report.savingsGrowth < 10 && <li>• Buat program simpanan dengan bunga menarik</li>}
                  <li>• Implementasi sistem reward simpanan</li>
                  <li>• Edukasi literasi keuangan anggota</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2">🛒 Pengembangan E-Commerce</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {report.totalOrders < 50 && <li>• Tingkatkan variasi produk lokal</li>}
                  <li>• Implementasi program diskon member</li>
                  <li>• Kembangkan sistem delivery/pickup</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">♻️ Program Bank Sampah</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {report.totalWasteCollected < 100 && <li>• Sosialisasi program ramah lingkungan</li>}
                  <li>• Tingkatkan titik pengumpulan</li>
                  <li>• Kembangkan partnership dengan industri daur ulang</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}