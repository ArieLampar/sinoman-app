import { getServerUser, getServerMemberData } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Member, Tenant, SavingsAccount, WasteBalance } from '@/types/database.types'
import Link from 'next/link'

type MemberWithRelations = Member & {
  tenant?: Tenant | null
  savings_account?: SavingsAccount | null
  waste_balance?: WasteBalance | null
}

export default async function DashboardPage() {
  // Get current user
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get member data - handle potential errors gracefully
  let memberData: MemberWithRelations | null = null
  try {
    memberData = await getServerMemberData(user.id)
  } catch (error) {
    console.error('Error fetching member data:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="bg-emerald-600 rounded-xl p-3">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">Sinoman SuperApp</h1>
                <p className="text-gray-600">Dashboard Koperasi Digital</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Selamat datang,</p>
              <p className="text-lg font-semibold text-gray-900">
                {memberData?.full_name || user.email?.split('@')[0] || 'Member'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Member Status Card */}
        {memberData ? (
          <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl p-6 mb-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold mb-2">Status Keanggotaan</h2>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{memberData.member_number}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span>{memberData.tenant?.tenant_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm4-3a1 1 0 00-1 1v1h2V4a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="capitalize">{memberData.status}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-100 text-sm">Bergabung sejak</p>
                <p className="font-semibold">
                  {formatDate(memberData.created_at)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-orange-800 mb-1">Selamat Datang di Sinoman SuperApp!</h3>
                <p className="text-orange-700 mb-4">Untuk mengakses semua fitur koperasi, silakan lengkapi profil anggota Anda terlebih dahulu.</p>
                <Link
                  href="/profile"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Lengkapi Profil Sekarang
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Savings Balance Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-sm text-gray-500">Total Simpanan</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                {memberData?.savings_account ? 
                  formatCurrency(memberData.savings_account.total_balance) : 
                  formatCurrency(0)
                }
              </h3>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Pokok:</span>
                  <span>{formatCurrency(memberData?.savings_account?.pokok_balance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wajib:</span>
                  <span>{formatCurrency(memberData?.savings_account?.wajib_balance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sukarela:</span>
                  <span>{formatCurrency(memberData?.savings_account?.sukarela_balance || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Waste Bank Balance Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <span className="text-sm text-gray-500">Saldo Waste Bank</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                {memberData?.waste_balance ? 
                  formatCurrency(memberData.waste_balance.current_balance) : 
                  formatCurrency(0)
                }
              </h3>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Total Kg:</span>
                  <span>{memberData?.waste_balance?.total_weight_collected_kg || 0} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Earnings:</span>
                  <span>{formatCurrency(memberData?.waste_balance?.total_earnings || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-500">Aktivitas</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Transaksi Terakhir</p>
                <p className="text-lg font-semibold text-gray-900">
                  {memberData?.savings_account?.last_transaction_date ? 
                    new Date(memberData.savings_account.last_transaction_date).toLocaleDateString('id-ID') :
                    'Belum ada transaksi'
                  }
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Status Member</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  memberData?.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {memberData?.status || 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Menu Utama</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/savings"
              className="group flex flex-col items-center p-6 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all duration-200"
            >
              <div className="bg-blue-600 rounded-full p-4 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Simpanan</h3>
              <p className="text-sm text-gray-600 text-center">Kelola simpanan pokok, wajib, dan sukarela</p>
            </Link>

            <Link
              href="/waste"
              className="group flex flex-col items-center p-6 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all duration-200"
            >
              <div className="bg-green-600 rounded-full p-4 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Bank Sampah</h3>
              <p className="text-sm text-gray-600 text-center">Setor sampah dan dapatkan keuntungan</p>
            </Link>

            <Link
              href="/orders"
              className="group flex flex-col items-center p-6 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all duration-200"
            >
              <div className="bg-orange-600 rounded-full p-4 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">E-Commerce</h3>
              <p className="text-sm text-gray-600 text-center">Belanja produk lokal dan UMKM</p>
            </Link>

            <Link
              href="/fit-challenge"
              className="group flex flex-col items-center p-6 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all duration-200"
            >
              <div className="bg-purple-600 rounded-full p-4 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Fit Challenge</h3>
              <p className="text-sm text-gray-600 text-center">Program kebugaran dan kesehatan</p>
            </Link>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pengaturan Akun</h2>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/profile"
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit Profile
            </Link>
            <Link 
              href="/settings"
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pengaturan
            </Link>
            <form action="/api/auth/logout" method="post" className="inline">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}