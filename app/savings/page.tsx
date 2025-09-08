import { getServerUser, getServerMemberData, getMemberTransactions } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Member, Tenant, SavingsAccount } from '@/types/database.types'

type MemberWithRelations = Member & {
  tenant?: Tenant | null
  savings_account?: SavingsAccount | null
}

export default async function SavingsPage() {
  // Get current user
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get member data
  let memberData: MemberWithRelations | null = null
  let transactions: any[] = []
  
  try {
    memberData = await getServerMemberData(user.id)
    if (memberData) {
      transactions = await getMemberTransactions(memberData.id, 10, 0)
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (!memberData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Akun Belum Terdaftar</h2>
            <p className="text-gray-600 mb-6">Anda belum terdaftar sebagai member koperasi. Silakan hubungi admin untuk aktivasi akun.</p>
            <Link href="/dashboard" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Simpanan Koperasi</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{memberData.member_number}</p>
              <p className="font-semibold text-gray-900">{memberData.full_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">Rekening Simpanan</h2>
              <p className="text-blue-100 mb-4">
                {memberData.savings_account?.account_number || 'Belum ada rekening'}
              </p>
              <div className="text-3xl font-bold">
                {formatCurrency(memberData.savings_account?.total_balance || 0)}
              </div>
              <p className="text-blue-100 text-sm mt-1">Total Saldo Simpanan</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Terakhir Update</p>
              <p className="font-semibold">
                {memberData.savings_account?.last_transaction_date ? 
                  formatDate(memberData.savings_account.last_transaction_date) :
                  'Belum ada transaksi'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Savings Types Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Simpanan Pokok */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Wajib
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Simpanan Pokok</h3>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(memberData.savings_account?.pokok_balance || 0)}
            </div>
            <p className="text-sm text-gray-600">
              Simpanan yang dibayarkan sekali pada saat masuk menjadi anggota
            </p>
          </div>

          {/* Simpanan Wajib */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6M9 17h6" />
                </svg>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                Bulanan
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Simpanan Wajib</h3>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(memberData.savings_account?.wajib_balance || 0)}
            </div>
            <p className="text-sm text-gray-600">
              Simpanan yang harus dibayarkan setiap bulan dalam jumlah dan waktu tertentu
            </p>
          </div>

          {/* Simpanan Sukarela */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                Fleksibel
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Simpanan Sukarela</h3>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(memberData.savings_account?.sukarela_balance || 0)}
            </div>
            <p className="text-sm text-gray-600">
              Simpanan yang dapat dilakukan sewaktu-waktu dengan jumlah tidak terbatas
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Riwayat Transaksi</h2>
            <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
              Lihat Semua
            </button>
          </div>
          
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      transaction.transaction_type === 'deposit' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.transaction_type === 'deposit' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {transaction.transaction_type === 'deposit' ? 'Setor' : 'Tarik'} {transaction.savings_type}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(transaction.transaction_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transaction_type === 'deposit' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Saldo: {formatCurrency(transaction.balance_after)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Transaksi</h3>
              <p className="text-gray-600">Riwayat transaksi simpanan Anda akan ditampilkan di sini</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Aksi Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-emerald-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium text-emerald-700">Setor Simpanan</span>
            </button>
            
            <button className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium text-blue-700">Cetak Buku Tabungan</span>
            </button>
            
            <button className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span className="font-medium text-purple-700">Bagikan Info</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}