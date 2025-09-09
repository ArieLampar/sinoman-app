'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type WasteCollection = {
  id: string
  collection_number: string
  collection_date: string
  total_weight_kg: number
  total_value: number
  status: string
  payment_status: string
  waste_collection_items: {
    id: string
    quantity: number
    subtotal: number
    waste_type: {
      name: string
      category: string
      is_organic: boolean
    }
  }[]
}

type WasteBankAccount = {
  id: string
  account_number: string
  current_balance: number
  total_earned: number
  total_withdrawn: number
  total_waste_kg: number
}

type EnvironmentalImpact = {
  total_co2_saved: number
  total_landfill_diverted: number
  total_compost_produced: number
}

export default function WasteBankPage() {
  const [account, setAccount] = useState<WasteBankAccount | null>(null)
  const [recentCollections, setRecentCollections] = useState<WasteCollection[]>([])
  const [environmentalImpact, setEnvironmentalImpact] = useState<EnvironmentalImpact | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/waste-bank')
      return
    }
    setUser(user)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchWasteBankAccount(),
        fetchRecentCollections(),
        fetchEnvironmentalImpact()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWasteBankAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!memberData) return

      // Check if account exists, create if not
      let { data: accountData, error } = await supabase
        .from('waste_bank_accounts')
        .select('*')
        .eq('member_id', memberData.id)
        .eq('tenant_id', 'demo-tenant')
        .single()

      if (error && error.code === 'PGRST116') {
        // Account doesn't exist, create it
        const { data: newAccount, error: createError } = await supabase
          .from('waste_bank_accounts')
          .insert({
            member_id: memberData.id,
            tenant_id: 'demo-tenant',
            account_number: `WB${Date.now().toString().slice(-6)}`,
            current_balance: 0
          })
          .select()
          .single()

        if (!createError) {
          accountData = newAccount
        }
      }

      if (accountData) {
        setAccount(accountData)
      }
    } catch (error) {
      console.error('Error fetching waste bank account:', error)
    }
  }

  const fetchRecentCollections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch(`/api/waste-collections?tenant_id=demo-tenant&member_id=${user.id}&limit=5`)
      const data = await response.json()
      
      if (data.success) {
        setRecentCollections(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching recent collections:', error)
    }
  }

  const fetchEnvironmentalImpact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch environmental impacts for user's collections
      const { data: impacts, error } = await supabase
        .from('environmental_impacts')
        .select('impact_type, quantity')
        .in('reference_id', 
          supabase
            .from('waste_collections')
            .select('id')
            .eq('member_id', user.id)
        )

      if (!error && impacts) {
        const totalImpacts = impacts.reduce((acc, impact) => {
          if (impact.impact_type === 'co2_saved') {
            acc.total_co2_saved += impact.quantity
          } else if (impact.impact_type === 'landfill_diverted') {
            acc.total_landfill_diverted += impact.quantity
          } else if (impact.impact_type === 'compost_produced') {
            acc.total_compost_produced += impact.quantity
          }
          return acc
        }, {
          total_co2_saved: 0,
          total_landfill_diverted: 0,
          total_compost_produced: 0
        })

        setEnvironmentalImpact(totalImpacts)
      }
    } catch (error) {
      console.error('Error fetching environmental impact:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processed': 'bg-green-100 text-green-800',
      'paid': 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Menunggu',
      'processed': 'Diproses',
      'paid': 'Selesai'
    }
    return texts[status as keyof typeof texts] || status
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Login Diperlukan</h2>
          <p className="text-gray-600 mb-4">Silakan login untuk mengakses Bank Sampah</p>
          <Link 
            href="/auth/login?redirect=/waste-bank"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏦 Bank Sampah</h1>
            <p className="text-gray-600 mt-2">
              Kelola sampah Anda dan dapatkan keuntungan dari daur ulang
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/deposit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Setor Sampah
            </Link>
            <Link 
              href="/maggot"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Maggot Farming
            </Link>
            <Link 
              href="/admin/waste"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              Admin Panel
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Account Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Saldo Saat Ini</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {account ? formatCurrency(account.current_balance) : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {account ? formatCurrency(account.total_earned) : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">⚖️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sampah</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {account ? `${account.total_waste_kg.toFixed(1)} kg` : '0 kg'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-semibold">💵</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Penarikan</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {account ? formatCurrency(account.total_withdrawn) : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Impact */}
            {environmentalImpact && (
              <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
                <h2 className="text-xl font-semibold mb-4">🌱 Dampak Lingkungan Anda</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {environmentalImpact.total_co2_saved.toFixed(1)}
                    </div>
                    <div className="text-sm opacity-90">kg CO₂ Diselamatkan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {environmentalImpact.total_landfill_diverted.toFixed(1)}
                    </div>
                    <div className="text-sm opacity-90">kg Sampah Tidak ke TPA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {environmentalImpact.total_compost_produced.toFixed(1)}
                    </div>
                    <div className="text-sm opacity-90">kg Kompos Dihasilkan</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/waste-bank/deposit" className="block">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-green-300">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">♻️</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Setor Sampah</h3>
                      <p className="text-sm text-gray-600">Buat setoran sampah baru</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/waste-bank/history" className="block">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📋</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Riwayat</h3>
                      <p className="text-sm text-gray-600">Lihat semua transaksi</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/waste-bank/withdraw" className="block">
                <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-purple-300">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💸</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Tarik Saldo</h3>
                      <p className="text-sm text-gray-600">Cairkan saldo Anda</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Collections */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Setoran Sampah Terbaru</h2>
                <Link 
                  href="/waste-bank/history"
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Lihat Semua →
                </Link>
              </div>

              {recentCollections.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📦</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Belum Ada Setoran Sampah
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Mulai berkontribusi untuk lingkungan dan dapatkan keuntungan
                  </p>
                  <Link
                    href="/waste-bank/deposit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Setor Sampah Sekarang
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCollections.map((collection) => (
                    <div key={collection.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            #{collection.collection_number}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(collection.collection_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">
                            {formatCurrency(collection.total_value)}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(collection.payment_status)}`}>
                            {getStatusText(collection.payment_status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {collection.total_weight_kg.toFixed(1)} kg
                          </span>
                          <span className="text-sm text-gray-600">
                            {collection.waste_collection_items?.length || 0} jenis sampah
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {collection.waste_collection_items?.slice(0, 3).map((item, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {item.waste_type.name}
                            </span>
                          ))}
                          {(collection.waste_collection_items?.length || 0) > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{(collection.waste_collection_items?.length || 0) - 3} lainnya
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Info */}
            {account && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Rekening</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Nomor Rekening</label>
                    <p className="text-lg font-mono text-gray-900">{account.account_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status Rekening</label>
                    <p className="text-lg text-green-600 font-medium">Aktif</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}