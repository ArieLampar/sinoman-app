'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavingsTransaction, Member } from '@/types/database.types'

interface TransactionWithMember extends SavingsTransaction {
  member: Member
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'transfer'>('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithMember | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [dateRange, filter, typeFilter])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('savings_transactions')
        .select(`
          *,
          member:members (*)
        `)
        .gte('transaction_date', `${dateRange.start}T00:00:00`)
        .lte('transaction_date', `${dateRange.end}T23:59:59`)
        .order('transaction_date', { ascending: false })

      if (filter === 'pending') {
        query = query.is('verified_by', null)
      } else if (filter === 'verified') {
        query = query.not('verified_by', 'is', null)
      }

      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setTransactions(data as TransactionWithMember[] || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyTransaction = async (transactionId: string, verified: boolean) => {
    try {
      setProcessing(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updateData = verified 
        ? { verified_by: user.id } 
        : { verified_by: null }

      const { error } = await supabase
        .from('savings_transactions')
        .update(updateData)
        .eq('id', transactionId)

      if (error) throw error

      // Update local state
      setTransactions(transactions.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, verified_by: updateData.verified_by }
          : transaction
      ))

      alert(verified ? 'Transaksi berhasil diverifikasi' : 'Verifikasi transaksi dibatalkan')
      setShowDetails(false)
    } catch (error) {
      console.error('Error verifying transaction:', error)
      alert('Gagal memproses verifikasi transaksi')
    } finally {
      setProcessing(false)
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
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    const icons = {
      deposit: '↓',
      withdrawal: '↑',
      transfer: '↔',
      shu: '★'
    }
    return icons[type as keyof typeof icons] || '•'
  }

  const getTransactionColor = (type: string) => {
    const colors = {
      deposit: 'text-green-600',
      withdrawal: 'text-red-600',
      transfer: 'text-blue-600',
      shu: 'text-yellow-600'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600'
  }

  const getSavingsTypeLabel = (type: string) => {
    const labels = {
      pokok: 'Simpanan Pokok',
      wajib: 'Simpanan Wajib',
      sukarela: 'Simpanan Sukarela'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getVerificationStatus = (transaction: TransactionWithMember) => {
    if (transaction.verified_by) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Terverifikasi
        </span>
      )
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          Menunggu Verifikasi
        </span>
      )
    }
  }

  // Calculate statistics
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  const pendingCount = transactions.filter(t => !t.verified_by).length
  const verifiedCount = transactions.filter(t => t.verified_by).length

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
        <h1 className="text-2xl font-bold text-gray-900">Monitor Transaksi</h1>
        <div className="text-sm text-gray-600">
          Total: {transactions.length} transaksi
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Transaksi</p>
              <p className="text-xl font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="bg-yellow-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Menunggu Verifikasi</p>
              <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Terverifikasi</p>
              <p className="text-xl font-bold text-green-600">{verifiedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Nilai</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Verifikasi
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua</option>
              <option value="pending">Menunggu Verifikasi</option>
              <option value="verified">Terverifikasi</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Transaksi
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua</option>
              <option value="deposit">Setoran</option>
              <option value="withdrawal">Penarikan</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kode Transaksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.transaction_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{transaction.member.full_name}</div>
                      <div className="text-sm text-gray-500">{transaction.member.member_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-2xl mr-2 ${getTransactionColor(transaction.transaction_type)}`}>
                        {getTransactionIcon(transaction.transaction_type)}
                      </span>
                      <div>
                        <div className="text-sm text-gray-900">
                          {transaction.transaction_type === 'deposit' ? 'Setoran' :
                           transaction.transaction_type === 'withdrawal' ? 'Penarikan' :
                           transaction.transaction_type === 'transfer' ? 'Transfer' : 'SHU'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getSavingsTypeLabel(transaction.savings_type)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                    transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getVerificationStatus(transaction)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction)
                        setShowDetails(true)
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada transaksi yang ditemukan</p>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Detail Transaksi</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Transaction Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Kode Transaksi</label>
                      <p className="text-gray-900 font-medium">{selectedTransaction.transaction_code}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Tanggal</label>
                      <p className="text-gray-900">{formatDate(selectedTransaction.transaction_date)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Jenis Transaksi</label>
                      <p className="text-gray-900">
                        {selectedTransaction.transaction_type === 'deposit' ? 'Setoran' :
                         selectedTransaction.transaction_type === 'withdrawal' ? 'Penarikan' :
                         selectedTransaction.transaction_type === 'transfer' ? 'Transfer' : 'SHU'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Jenis Simpanan</label>
                      <p className="text-gray-900">{getSavingsTypeLabel(selectedTransaction.savings_type)}</p>
                    </div>
                  </div>
                </div>

                {/* Member Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Informasi Anggota</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Nama</label>
                        <p className="text-gray-900">{selectedTransaction.member.full_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">No. Anggota</label>
                        <p className="text-gray-900">{selectedTransaction.member.member_number}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Detail Transaksi</h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jumlah:</span>
                        <span className={`font-bold ${
                          selectedTransaction.transaction_type === 'deposit' || selectedTransaction.transaction_type === 'shu'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {selectedTransaction.transaction_type === 'deposit' || selectedTransaction.transaction_type === 'shu' ? '+' : '-'}
                          {formatCurrency(selectedTransaction.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Saldo Sebelum:</span>
                        <span className="font-medium">{formatCurrency(selectedTransaction.balance_before)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Saldo Sesudah:</span>
                        <span className="font-medium">{formatCurrency(selectedTransaction.balance_after)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Metode Pembayaran:</span>
                        <span className="font-medium">
                          {selectedTransaction.payment_method === 'cash' ? 'Tunai' :
                           selectedTransaction.payment_method === 'bank_transfer' ? 'Transfer Bank' : 'Transfer Simpanan'}
                        </span>
                      </div>
                      {selectedTransaction.description && (
                        <div className="border-t pt-3">
                          <span className="text-gray-600">Keterangan:</span>
                          <p className="text-gray-900 mt-1">{selectedTransaction.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Status Verifikasi</h3>
                      <p className="text-gray-600 text-sm">
                        {selectedTransaction.verified_by ? 'Transaksi telah diverifikasi' : 'Transaksi menunggu verifikasi admin'}
                      </p>
                    </div>
                    <div>
                      {getVerificationStatus(selectedTransaction)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                  {!selectedTransaction.verified_by ? (
                    <button
                      onClick={() => verifyTransaction(selectedTransaction.id, true)}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing ? 'Memproses...' : 'Verifikasi Transaksi'}
                    </button>
                  ) : (
                    <button
                      onClick={() => verifyTransaction(selectedTransaction.id, false)}
                      disabled={processing}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {processing ? 'Memproses...' : 'Batalkan Verifikasi'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}