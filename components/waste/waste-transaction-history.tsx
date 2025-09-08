'use client'

import { useState } from 'react'

interface WasteTransactionHistoryProps {
  transactions: Array<{
    id: string
    transaction_number: string
    transaction_date: string
    total_weight_kg: number
    total_value: number
    net_value: number
    payment_status: string
    details: Array<{
      waste_category: { category_name: string; sub_category: string }
      weight_kg: number
      subtotal: number
    }>
  }>
}

export default function WasteTransactionHistory({ transactions }: WasteTransactionHistoryProps) {
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(2)} kg`
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Dibayar
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Menunggu
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Gagal
          </span>
        )
      default:
        return (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const filteredTransactions = transactions
    .filter(transaction => {
      if (filterStatus === 'all') return true
      return transaction.payment_status.toLowerCase() === filterStatus
    })
    .sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime()
      const dateB = new Date(b.transaction_date).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

  const toggleExpanded = (transactionId: string) => {
    setExpandedTransaction(
      expandedTransaction === transactionId ? null : transactionId
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Transaksi</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Transaksi</h3>
            <p className="text-gray-600">Riwayat setoran sampah Anda akan ditampilkan di sini</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="px-6 py-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Riwayat Transaksi</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredTransactions.length} dari {transactions.length} transaksi
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'paid' | 'pending')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Dibayar</option>
              <option value="pending">Menunggu</option>
            </select>
            
            {/* Sort */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {filteredTransactions.map((transaction) => (
          <div key={transaction.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        #{transaction.transaction_number}
                      </p>
                      {getStatusBadge(transaction.payment_status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(transaction.transaction_date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {transaction.details.length} item • {formatWeight(transaction.total_weight_kg)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(transaction.net_value)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Gross: {formatCurrency(transaction.total_value)}
                  </p>
                </div>
                
                <button
                  onClick={() => toggleExpanded(transaction.id)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedTransaction === transaction.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedTransaction === transaction.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Detail Item</h4>
                <div className="space-y-2">
                  {transaction.details.map((detail, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {detail.waste_category.category_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {detail.waste_category.sub_category} • {formatWeight(detail.weight_kg)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(detail.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Transaction Summary */}
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Subtotal:</span>
                      <span className="font-medium text-emerald-800">
                        {formatCurrency(transaction.total_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Admin Fee (2%):</span>
                      <span className="font-medium text-emerald-800">
                        -{formatCurrency(transaction.total_value - transaction.net_value)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-emerald-200">
                      <span className="font-semibold text-emerald-800">Total Diterima:</span>
                      <span className="font-bold text-emerald-900">
                        {formatCurrency(transaction.net_value)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="mt-4 flex justify-end space-x-2">
                  <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1 rounded border border-emerald-200 hover:bg-emerald-50">
                    Cetak Struk
                  </button>
                  {transaction.payment_status === 'paid' && (
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50">
                      Transfer ke Simpanan
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Total {filteredTransactions.length} transaksi ditampilkan
          </span>
          <div className="flex space-x-4">
            <span className="text-gray-600">
              Total Berat: {formatWeight(filteredTransactions.reduce((sum, t) => sum + t.total_weight_kg, 0))}
            </span>
            <span className="text-gray-600">
              Total Nilai: {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.net_value, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}