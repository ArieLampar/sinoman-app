'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SavingsAccount, Member } from '@/types/database.types'
import Link from 'next/link'

type TransactionType = 'deposit' | 'withdrawal' | 'transfer'
type SavingsType = 'pokok' | 'wajib' | 'sukarela'
type PaymentMethod = 'cash' | 'bank_transfer' | 'savings_transfer'

export default function NewTransactionPage() {
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  
  const [transactionType, setTransactionType] = useState<TransactionType>('deposit')
  const [savingsType, setSavingsType] = useState<SavingsType>('sukarela')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [transferToMember, setTransferToMember] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (transactionType === 'transfer') {
      fetchMembers()
    }
  }, [transactionType])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (memberData) {
        setMember(memberData)

        const { data: accountData } = await supabase
          .from('savings_accounts')
          .select('*')
          .eq('member_id', memberData.id)
          .single()
        
        if (accountData) {
          setSavingsAccount(accountData)
        } else {
          const { data: newAccount } = await supabase
            .from('savings_accounts')
            .insert({
              member_id: memberData.id,
              tenant_id: memberData.tenant_id,
              account_number: generateAccountNumber(),
              pokok_balance: 0,
              wajib_balance: 0,
              sukarela_balance: 0,
              total_balance: 0
            })
            .select()
            .single()
          
          if (newAccount) {
            setSavingsAccount(newAccount)
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .neq('id', member?.id)
        .eq('status', 'active')
        .order('full_name')
      
      if (data) {
        setMembers(data)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const generateAccountNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `SAV-${year}${month}-${random}`
  }

  const generateTransactionCode = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `TRX-${year}${month}${day}-${random}`
  }

  const validateTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Jumlah transaksi harus lebih dari 0')
      return false
    }

    if (!savingsAccount) {
      alert('Akun simpanan tidak ditemukan')
      return false
    }

    const transactionAmount = parseFloat(amount)

    if (transactionType === 'withdrawal') {
      const currentBalance = savingsAccount[`${savingsType}_balance` as keyof SavingsAccount] as number
      if (transactionAmount > currentBalance) {
        alert(`Saldo ${savingsType} tidak mencukupi. Saldo saat ini: ${formatCurrency(currentBalance)}`)
        return false
      }

      if (savingsType === 'pokok') {
        alert('Simpanan pokok tidak dapat ditarik')
        return false
      }
    }

    if (transactionType === 'transfer' && !transferToMember) {
      alert('Pilih anggota tujuan transfer')
      return false
    }

    return true
  }

  const processTransaction = async () => {
    if (!validateTransaction() || !member || !savingsAccount) return
    
    setProcessing(true)
    try {
      const transactionAmount = parseFloat(amount)
      const transactionCode = generateTransactionCode()
      
      const currentBalance = savingsAccount[`${savingsType}_balance` as keyof SavingsAccount] as number
      let newBalance = currentBalance
      
      if (transactionType === 'deposit') {
        newBalance = currentBalance + transactionAmount
      } else if (transactionType === 'withdrawal') {
        newBalance = currentBalance - transactionAmount
      } else if (transactionType === 'transfer') {
        newBalance = currentBalance - transactionAmount
      }

      const { error: transactionError } = await supabase
        .from('savings_transactions')
        .insert({
          member_id: member.id,
          tenant_id: member.tenant_id,
          transaction_code: transactionCode,
          transaction_type: transactionType,
          savings_type: savingsType,
          amount: transactionAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: description || `${transactionType} ${savingsType}`,
          payment_method: paymentMethod,
          created_by: member.id,
          transaction_date: new Date().toISOString()
        })

      if (transactionError) throw transactionError

      const updateData: Record<string, number | string> = {
        [`${savingsType}_balance`]: newBalance,
        last_transaction_date: new Date().toISOString()
      }
      
      const newTotalBalance = 
        (savingsType === 'pokok' ? newBalance : savingsAccount.pokok_balance) +
        (savingsType === 'wajib' ? newBalance : savingsAccount.wajib_balance) +
        (savingsType === 'sukarela' ? newBalance : savingsAccount.sukarela_balance)
      
      updateData.total_balance = newTotalBalance

      const { error: updateError } = await supabase
        .from('savings_accounts')
        .update(updateData)
        .eq('id', savingsAccount.id)

      if (updateError) throw updateError

      if (transactionType === 'transfer' && transferToMember) {
        const { data: targetMember } = await supabase
          .from('members')
          .select('*')
          .eq('id', transferToMember)
          .single()

        if (targetMember) {
          const { data: targetAccount } = await supabase
            .from('savings_accounts')
            .select('*')
            .eq('member_id', targetMember.id)
            .single()

          if (targetAccount) {
            const targetCurrentBalance = targetAccount[`${savingsType}_balance` as keyof SavingsAccount] as number
            const targetNewBalance = targetCurrentBalance + transactionAmount

            await supabase
              .from('savings_transactions')
              .insert({
                member_id: targetMember.id,
                tenant_id: targetMember.tenant_id,
                transaction_code: `${transactionCode}-RCV`,
                transaction_type: 'deposit',
                savings_type: savingsType,
                amount: transactionAmount,
                balance_before: targetCurrentBalance,
                balance_after: targetNewBalance,
                description: `Transfer dari ${member.full_name}`,
                payment_method: 'savings_transfer',
                created_by: member.id,
                transaction_date: new Date().toISOString()
              })

            const targetUpdateData: Record<string, number | string> = {
              [`${savingsType}_balance`]: targetNewBalance,
              last_transaction_date: new Date().toISOString()
            }
            
            const targetNewTotalBalance = 
              (savingsType === 'pokok' ? targetNewBalance : targetAccount.pokok_balance) +
              (savingsType === 'wajib' ? targetNewBalance : targetAccount.wajib_balance) +
              (savingsType === 'sukarela' ? targetNewBalance : targetAccount.sukarela_balance)
            
            targetUpdateData.total_balance = targetNewTotalBalance

            await supabase
              .from('savings_accounts')
              .update(targetUpdateData)
              .eq('id', targetAccount.id)
          }
        }
      }

      alert('Transaksi berhasil diproses!')
      router.push('/transactions')
    } catch (error) {
      console.error('Error processing transaction:', error)
      alert('Gagal memproses transaksi. Silakan coba lagi.')
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!member || !savingsAccount) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Data tidak valid</p>
        <div className="text-center mt-4">
          <Link href="/transactions" className="text-green-600 hover:underline">
            Kembali
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/transactions" className="text-green-600 hover:underline mb-6 inline-block">
        ← Kembali ke Riwayat Transaksi
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Transaksi Baru</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Informasi Anggota</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nama</p>
              <p className="font-medium">{member.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">No. Anggota</p>
              <p className="font-medium">{member.member_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">No. Rekening</p>
              <p className="font-medium">{savingsAccount.account_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Simpanan</p>
              <p className="font-medium text-green-600">{formatCurrency(savingsAccount.total_balance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Detail Transaksi</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Transaksi
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="deposit">Setoran</option>
                <option value="withdrawal">Penarikan</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Simpanan
              </label>
              <select
                value={savingsType}
                onChange={(e) => setSavingsType(e.target.value as SavingsType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {transactionType === 'deposit' && <option value="pokok">Simpanan Pokok</option>}
                <option value="wajib">Simpanan Wajib</option>
                <option value="sukarela">Simpanan Sukarela</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Saldo saat ini: {formatCurrency(savingsAccount[`${savingsType}_balance` as keyof SavingsAccount] as number)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                step="1000"
              />
            </div>

            {transactionType === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer ke Anggota
                </label>
                <select
                  value={transferToMember}
                  onChange={(e) => setTransferToMember(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Pilih Anggota</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} - {m.member_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="cash">Tunai</option>
                <option value="bank_transfer">Transfer Bank</option>
                {transactionType === 'transfer' && (
                  <option value="savings_transfer">Transfer Simpanan</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keterangan (Opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Tambahkan keterangan transaksi..."
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={processTransaction}
              disabled={processing || !amount}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {processing ? 'Memproses...' : 'Proses Transaksi'}
            </button>
            <Link
              href="/transactions"
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              Batal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}