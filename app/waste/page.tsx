import { getServerUser, getServerMemberData } from '@/lib/supabase/server'
import { getWasteTransactions, getWasteCategories } from '@/lib/waste/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WasteDepositForm from '@/components/waste/waste-deposit-form'
import WasteTransactionHistory from '@/components/waste/waste-transaction-history'
import WasteCategoryList from '@/components/waste/waste-category-list'
import type { Member, Tenant, WasteBalance } from '@/types/database.types'

type MemberWithRelations = Member & {
  tenant?: Tenant | null
  waste_balance?: WasteBalance | null
}

export default async function WastePage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }

  let memberData: MemberWithRelations | null = null
  let transactions: Array<{
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
  }> = []
  let categories: Array<{
    id: string
    category_name: string
    sub_category: string
    buying_price_per_kg: number
    minimum_weight_kg: number
    is_active: boolean
  }> = []

  try {
    memberData = await getServerMemberData(user.id)
    if (memberData) {
      transactions = await getWasteTransactions(memberData.id, 10)
      categories = await getWasteCategories(memberData.tenant_id)
    }
  } catch (error) {
    console.error('Error fetching waste data:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('id-ID', {
  //     day: 'numeric',
  //     month: 'long',
  //     year: 'numeric'
  //   })
  // }

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(2)} kg`
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
            <p className="text-gray-600 mb-6">Anda belum terdaftar sebagai member koperasi. Silakan lengkapi profil untuk mengakses Bank Sampah.</p>
            <Link href="/profile" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
              Lengkapi Profil
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
              <h1 className="text-2xl font-bold text-gray-900">Bank Sampah</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{memberData.member_number}</p>
              <p className="font-semibold text-gray-900">{memberData.full_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Waste Balance Summary */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl p-6 mb-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">Saldo Bank Sampah</h2>
              <div className="text-3xl font-bold mb-2">
                {formatCurrency(memberData.waste_balance?.current_balance || 0)}
              </div>
              <p className="text-green-100 text-sm">Saldo tersedia untuk ditransfer ke simpanan</p>
            </div>
            <div className="text-right">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-2">
                <p className="text-sm text-green-100">Total Sampah Disetor</p>
                <p className="text-lg font-semibold">
                  {formatWeight(memberData.waste_balance?.total_weight_collected_kg || 0)}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <p className="text-sm text-green-100">Total Pendapatan</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(memberData.waste_balance?.total_earnings || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Categories and Deposit Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Waste Categories */}
            <WasteCategoryList categories={categories} />
            
            {/* Deposit Form */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Setor Sampah</h2>
                <p className="text-sm text-gray-600">Isi formulir untuk menyetor sampah ke Bank Sampah</p>
              </div>
              <div className="p-6">
                <WasteDepositForm 
                  memberId={memberData.id}
                  categories={categories}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions and Stats */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-emerald-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="font-medium text-emerald-700">Transfer ke Simpanan</span>
                </button>
                
                <button className="w-full flex items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-blue-700">Cetak Laporan</span>
                </button>
                
                <Link 
                  href="/waste/collection-points"
                  className="w-full flex items-center justify-center p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium text-purple-700">Lokasi TPS</span>
                </Link>
              </div>
            </div>

            {/* Monthly Stats */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistik Bulan Ini</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sampah Disetor</span>
                  <span className="font-semibold text-gray-900">12.5 kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pendapatan</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(45000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Frekuensi Setor</span>
                  <span className="font-semibold text-gray-900">8 kali</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peringkat Member</span>
                    <span className="font-semibold text-green-600">#15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Impact */}
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-green-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Dampak Lingkungan
              </h2>
              <div className="space-y-3">
                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                  <p className="text-sm text-gray-600">CO₂ yang dikurangi</p>
                  <p className="text-lg font-bold text-green-700">24.5 kg</p>
                </div>
                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Pohon setara diselamatkan</p>
                  <p className="text-lg font-bold text-green-700">2 pohon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <WasteTransactionHistory transactions={transactions} />
        </div>
      </div>
    </div>
  )
}