'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavingsTransaction } from '@/types/database.types'

interface ReportData {
  totalDeposits: number
  totalWithdrawals: number
  totalTransfers: number
  netFlow: number
  transactionCount: number
  pokokBalance: number
  wajibBalance: number
  sukarelaBalance: number
  totalBalance: number
}

export default function TransactionReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'custom'>('monthly')
  
  const supabase = createClient()

  useEffect(() => {
    generateReport()
  }, [dateRange])

  useEffect(() => {
    updateDateRange()
  }, [reportType])

  const updateDateRange = () => {
    const today = new Date()
    let start: Date
    let end = today

    switch (reportType) {
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'yearly':
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear(), 11, 31)
        break
      default:
        return
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!memberData) return

      const startDate = `${dateRange.start}T00:00:00`
      const endDate = `${dateRange.end}T23:59:59`

      const { data: transactionData } = await supabase
        .from('savings_transactions')
        .select('*')
        .eq('member_id', memberData.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })

      const { data: accountData } = await supabase
        .from('savings_accounts')
        .select('*')
        .eq('member_id', memberData.id)
        .single()

      if (transactionData) {
        setTransactions(transactionData)
        
        const totalDeposits = transactionData
          .filter(t => t.transaction_type === 'deposit' || t.transaction_type === 'shu')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const totalWithdrawals = transactionData
          .filter(t => t.transaction_type === 'withdrawal')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const totalTransfers = transactionData
          .filter(t => t.transaction_type === 'transfer')
          .reduce((sum, t) => sum + t.amount, 0)

        setReportData({
          totalDeposits,
          totalWithdrawals,
          totalTransfers,
          netFlow: totalDeposits - totalWithdrawals - totalTransfers,
          transactionCount: transactionData.length,
          pokokBalance: accountData?.pokok_balance || 0,
          wajibBalance: accountData?.wajib_balance || 0,
          sukarelaBalance: accountData?.sukarela_balance || 0,
          totalBalance: accountData?.total_balance || 0
        })
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!transactions.length) return

    const headers = [
      'Tanggal',
      'Kode Transaksi',
      'Jenis Transaksi',
      'Jenis Simpanan',
      'Jumlah',
      'Saldo Sebelum',
      'Saldo Sesudah',
      'Keterangan',
      'Metode Pembayaran'
    ]

    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        new Date(t.transaction_date).toLocaleDateString('id-ID'),
        t.transaction_code,
        t.transaction_type,
        t.savings_type,
        t.amount,
        t.balance_before,
        t.balance_after,
        `"${t.description || ''}"`,
        t.payment_method
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `laporan-transaksi-${dateRange.start}-${dateRange.end}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID')
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
        <h1 className="text-3xl font-bold text-gray-900">Laporan Transaksi</h1>
        <button
          onClick={exportToCSV}
          disabled={!transactions.length}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
        >
          📄 Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periode Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
              <option value="custom">Kustom</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              disabled={reportType !== 'custom'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              disabled={reportType !== 'custom'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={generateReport}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Update Laporan
          </button>
        </div>
      </div>

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Setoran</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalDeposits)}</p>
              </div>
              <div className="text-3xl text-green-600">↓</div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Penarikan</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalWithdrawals)}</p>
              </div>
              <div className="text-3xl text-red-600">↑</div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transfer</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totalTransfers)}</p>
              </div>
              <div className="text-3xl text-blue-600">↔</div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jumlah Transaksi</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.transactionCount}</p>
              </div>
              <div className="text-3xl text-gray-600">#</div>
            </div>
          </div>
        </div>
      )}

      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Ringkasan Keuangan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Arus Masuk (Setoran + SHU)</span>
                <span className="font-semibold text-green-600">{formatCurrency(reportData.totalDeposits)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Arus Keluar (Penarikan + Transfer)</span>
                <span className="font-semibold text-red-600">{formatCurrency(reportData.totalWithdrawals + reportData.totalTransfers)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium">Arus Kas Bersih</span>
                  <span className={`font-bold text-lg ${
                    reportData.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData.netFlow)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Saldo Simpanan Terkini</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Simpanan Pokok</span>
                <span className="font-semibold">{formatCurrency(reportData.pokokBalance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Simpanan Wajib</span>
                <span className="font-semibold">{formatCurrency(reportData.wajibBalance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Simpanan Sukarela</span>
                <span className="font-semibold">{formatCurrency(reportData.sukarelaBalance)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium">Total Simpanan</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(reportData.totalBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Detail Transaksi</h3>
          <p className="text-gray-600">Periode: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Simpanan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {transaction.transaction_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {transaction.transaction_type === 'deposit' ? 'Setoran' :
                     transaction.transaction_type === 'withdrawal' ? 'Penarikan' :
                     transaction.transaction_type === 'transfer' ? 'Transfer' : 'SHU'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {transaction.savings_type === 'pokok' ? 'Pokok' :
                     transaction.savings_type === 'wajib' ? 'Wajib' : 'Sukarela'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                    transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(transaction.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada transaksi dalam periode yang dipilih</p>
          </div>
        )}
      </div>
    </div>
  )
}