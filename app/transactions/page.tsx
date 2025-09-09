'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavingsTransaction, SavingsAccount, Member } from '@/types/database.types'
import Link from 'next/link'

interface TransactionWithDetails extends SavingsTransaction {
  member?: Member
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'transfer' | 'shu'>('all')
  const [savingsTypeFilter, setSavingsTypeFilter] = useState<'all' | 'pokok' | 'wajib' | 'sukarela'>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  
  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
    fetchSavingsAccount()
  }, [])

  const fetchSavingsAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!memberData) return

      const { data: accountData } = await supabase
        .from('savings_accounts')
        .select('*')
        .eq('member_id', memberData.id)
        .single()

      if (accountData) {
        setSavingsAccount(accountData)
      }
    } catch (error) {
      console.error('Error fetching savings account:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!memberData) return

      const query = supabase
        .from('savings_transactions')
        .select('*')
        .eq('member_id', memberData.id)
        .order('transaction_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = filter === 'all' || transaction.transaction_type === filter
    const matchesSavingsType = savingsTypeFilter === 'all' || transaction.savings_type === savingsTypeFilter
    
    let matchesDate = true
    if (dateRange.start) {
      matchesDate = new Date(transaction.transaction_date) >= new Date(dateRange.start)
    }
    if (dateRange.end && matchesDate) {
      matchesDate = new Date(transaction.transaction_date) <= new Date(dateRange.end + 'T23:59:59')
    }
    
    return matchesType && matchesSavingsType && matchesDate
  })

  const calculateTotals = () => {
    return filteredTransactions.reduce((acc, transaction) => {
      if (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu') {
        acc.income += transaction.amount
      } else if (transaction.transaction_type === 'withdrawal') {
        acc.expense += transaction.amount
      }
      return acc
    }, { income: 0, expense: 0 })
  }

  const totals = calculateTotals()

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
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Transaksi</h1>
        <Link 
          href="/transactions/new"
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Transaksi Baru
        </Link>
      </div>

      {savingsAccount && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-600 text-sm">Simpanan Pokok</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(savingsAccount.pokok_balance)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-600 text-sm">Simpanan Wajib</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(savingsAccount.wajib_balance)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-600 text-sm">Simpanan Sukarela</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(savingsAccount.sukarela_balance)}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-md p-4">
            <p className="text-gray-600 text-sm">Total Simpanan</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(savingsAccount.total_balance)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Transaksi</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Transaksi</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Semua</option>
              <option value="deposit">Setoran</option>
              <option value="withdrawal">Penarikan</option>
              <option value="transfer">Transfer</option>
              <option value="shu">SHU</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Simpanan</label>
            <select
              value={savingsTypeFilter}
              onChange={(e) => setSavingsTypeFilter(e.target.value as typeof savingsTypeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Semua</option>
              <option value="pokok">Pokok</option>
              <option value="wajib">Wajib</option>
              <option value="sukarela">Sukarela</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Total Masuk</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.income)}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Total Keluar</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totals.expense)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Selisih</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.income - totals.expense)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  Jenis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Simpanan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.transaction_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-2xl ${getTransactionColor(transaction.transaction_type)}`}>
                      {getTransactionIcon(transaction.transaction_type)}
                    </span>
                    <span className="ml-2 text-sm text-gray-900">
                      {transaction.transaction_type === 'deposit' ? 'Setoran' :
                       transaction.transaction_type === 'withdrawal' ? 'Penarikan' :
                       transaction.transaction_type === 'transfer' ? 'Transfer' : 'SHU'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getSavingsTypeLabel(transaction.savings_type)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description || '-'}
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
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <Link
                      href={`/transactions/${transaction.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada transaksi yang ditemukan</p>
          </div>
        )}
      </div>
    </div>
  )
}