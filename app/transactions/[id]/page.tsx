'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SavingsTransaction, Member, SavingsAccount } from '@/types/database.types'
import Link from 'next/link'

interface TransactionDetail extends SavingsTransaction {
  member?: Member
  verified_by_user?: {
    full_name: string
  }
}

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchTransactionDetail()
    }
  }, [params.id])

  const fetchTransactionDetail = async () => {
    try {
      const { data: transactionData, error } = await supabase
        .from('savings_transactions')
        .select(`
          *,
          member:members!member_id (*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      if (transactionData) {
        setTransaction(transactionData as TransactionDetail)
        
        const { data: accountData } = await supabase
          .from('savings_accounts')
          .select('*')
          .eq('member_id', transactionData.member_id)
          .single()
        
        if (accountData) {
          setSavingsAccount(accountData)
        }
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
      router.push('/transactions')
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
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      deposit: 'Setoran',
      withdrawal: 'Penarikan',
      transfer: 'Transfer',
      shu: 'SHU'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getSavingsTypeLabel = (type: string) => {
    const labels = {
      pokok: 'Simpanan Pokok',
      wajib: 'Simpanan Wajib',
      sukarela: 'Simpanan Sukarela'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'Tunai',
      bank_transfer: 'Transfer Bank',
      savings_transfer: 'Transfer Simpanan'
    }
    return methods[method as keyof typeof methods] || method
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!transaction || !transaction.member) return
    
    const csvContent = `
Koperasi Sinoman SuperApp
BUKTI TRANSAKSI SIMPANAN

================================
INFORMASI TRANSAKSI
================================
Kode Transaksi: ${transaction.transaction_code}
Tanggal: ${formatDate(transaction.transaction_date)}
Jenis Transaksi: ${getTransactionTypeLabel(transaction.transaction_type)}
Jenis Simpanan: ${getSavingsTypeLabel(transaction.savings_type)}
Metode Pembayaran: ${getPaymentMethodLabel(transaction.payment_method)}

================================
INFORMASI ANGGOTA
================================
Nama: ${transaction.member.full_name}
No. Anggota: ${transaction.member.member_number}
No. Rekening: ${savingsAccount?.account_number || '-'}

================================
DETAIL TRANSAKSI
================================
Jumlah: ${formatCurrency(transaction.amount)}
Saldo Sebelum: ${formatCurrency(transaction.balance_before)}
Saldo Sesudah: ${formatCurrency(transaction.balance_after)}
Keterangan: ${transaction.description || '-'}

================================
SALDO SIMPANAN
================================
Simpanan Pokok: ${formatCurrency(savingsAccount?.pokok_balance || 0)}
Simpanan Wajib: ${formatCurrency(savingsAccount?.wajib_balance || 0)}
Simpanan Sukarela: ${formatCurrency(savingsAccount?.sukarela_balance || 0)}
Total Simpanan: ${formatCurrency(savingsAccount?.total_balance || 0)}
`
    
    const blob = new Blob([csvContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Transaksi-${transaction.transaction_code}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!transaction || !transaction.member) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Transaksi tidak ditemukan</p>
        <div className="text-center mt-4">
          <Link href="/transactions" className="text-green-600 hover:underline">
            Kembali ke Riwayat Transaksi
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="no-print">
        <Link href="/transactions" className="text-green-600 hover:underline mb-6 inline-block">
          ← Kembali ke Riwayat Transaksi
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8" id="receipt">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Koperasi Sinoman SuperApp</h1>
            <p className="text-gray-600 mt-2">BUKTI TRANSAKSI SIMPANAN</p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Kode Transaksi</p>
                <p className="font-bold text-lg">{transaction.transaction_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Tanggal Transaksi</p>
                <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Informasi Anggota</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Nama:</span>
                  <p className="font-medium">{transaction.member.full_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">No. Anggota:</span>
                  <p className="font-medium">{transaction.member.member_number}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">No. Rekening:</span>
                  <p className="font-medium">{savingsAccount?.account_number || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Informasi Transaksi</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Jenis Transaksi:</span>
                  <p className="font-medium">{getTransactionTypeLabel(transaction.transaction_type)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Jenis Simpanan:</span>
                  <p className="font-medium">{getSavingsTypeLabel(transaction.savings_type)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Metode Pembayaran:</span>
                  <p className="font-medium">{getPaymentMethodLabel(transaction.payment_method)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold mb-4">Detail Transaksi</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span>Jumlah Transaksi:</span>
                <span className={`font-bold ${
                  transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'deposit' || transaction.transaction_type === 'shu' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Saldo Sebelum:</span>
                <span className="font-medium">{formatCurrency(transaction.balance_before)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Saldo Sesudah:</span>
                <span className="font-medium">{formatCurrency(transaction.balance_after)}</span>
              </div>
              {transaction.description && (
                <div className="pt-3 border-t">
                  <span className="text-sm text-gray-600">Keterangan:</span>
                  <p className="mt-1">{transaction.description}</p>
                </div>
              )}
            </div>
          </div>

          {savingsAccount && (
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h3 className="font-semibold mb-4">Saldo Simpanan Terkini</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Simpanan Pokok</p>
                  <p className="font-medium">{formatCurrency(savingsAccount.pokok_balance)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Simpanan Wajib</p>
                  <p className="font-medium">{formatCurrency(savingsAccount.wajib_balance)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Simpanan Sukarela</p>
                  <p className="font-medium">{formatCurrency(savingsAccount.sukarela_balance)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Simpanan</p>
                  <p className="font-bold text-green-600">{formatCurrency(savingsAccount.total_balance)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 mt-8">
            <p>Dokumen ini adalah bukti transaksi yang sah</p>
            <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="no-print mt-6 flex gap-4">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🖨️ Cetak Bukti
          </button>
          <button
            onClick={handleExport}
            className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
          >
            💾 Download
          </button>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}