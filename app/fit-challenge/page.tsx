'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import Image from 'next/image'

type FitChallenge = Database['public']['Tables']['fit_challenges']['Row']

interface EnhancedFitChallenge extends FitChallenge {
  spots_remaining: number
  registration_open: boolean
  days_until_start: number
}

export default function FitChallengePage() {
  const [challenges, setChallenges] = useState<EnhancedFitChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active'>('upcoming')
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchChallenges()
  }, [filter])

  const fetchChallenges = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fit-challenge?status=${filter === 'all' ? 'active' : filter}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setChallenges(data.data)
      }
    } catch (error) {
      console.error('Error fetching challenges:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (challenge: EnhancedFitChallenge) => {
    if (!challenge.registration_open) {
      return <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">Pendaftaran Ditutup</span>
    }
    if (challenge.spots_remaining <= 0) {
      return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">Penuh</span>
    }
    if (challenge.status === 'active') {
      return <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Sedang Berlangsung</span>
    }
    return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">Buka Pendaftaran</span>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏃‍♂️ Sinoman Fit Challenge
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Program kesehatan 8 minggu yang akan mengubah hidup Anda! 
            Bergabunglah dengan komunitas sehat Koperasi Sinoman.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <div className="text-3xl mb-2">🏋️‍♀️</div>
            <h3 className="font-semibold text-gray-900">Training Terpadu</h3>
            <p className="text-sm text-gray-600">Cardio, strength, dan flexibility</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900">Progress Tracking</h3>
            <p className="text-sm text-gray-600">Monitor perkembangan harian</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="font-semibold text-gray-900">Leaderboard</h3>
            <p className="text-sm text-gray-600">Kompetisi sehat & motivasi</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="font-semibold text-gray-900">Rewards</h3>
            <p className="text-sm text-gray-600">Hadiah untuk pencapaian</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            {(['upcoming', 'active', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  filter === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'upcoming' ? 'Akan Datang' : 
                 tab === 'active' ? 'Sedang Berjalan' : 'Semua'}
              </button>
            ))}
          </div>
        </div>

        {/* Challenges Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏃‍♂️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Belum ada challenge tersedia
            </h3>
            <p className="text-gray-600">
              Challenge baru akan segera hadir. Pantau terus halaman ini!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Challenge Image */}
                <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
                  {challenge.photo_url ? (
                    <Image
                      src={challenge.photo_url}
                      alt={challenge.challenge_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-6xl">🏋️‍♀️</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(challenge)}
                  </div>
                  {challenge.featured && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-1 rounded-full">
                        ⭐ Featured
                      </span>
                    </div>
                  )}
                </div>

                {/* Challenge Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      Batch #{challenge.batch_number}
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(challenge.registration_fee)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {challenge.challenge_name}
                  </h3>
                  
                  {challenge.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {challenge.description}
                    </p>
                  )}

                  {/* Challenge Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-5">📅</span>
                      <span>{formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}</span>
                    </div>
                    
                    {challenge.trainer_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5">👨‍🏫</span>
                        <span>{challenge.trainer_name}</span>
                      </div>
                    )}
                    
                    {challenge.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5">📍</span>
                        <span>{challenge.location}</span>
                      </div>
                    )}
                    
                    {challenge.schedule_days && challenge.schedule_time && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5">⏰</span>
                        <span>{challenge.schedule_days.toUpperCase()} jam {challenge.schedule_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Participants Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{challenge.current_participants}</span>
                      /{challenge.max_participants} peserta
                    </div>
                    <div className="text-sm text-gray-600">
                      {challenge.spots_remaining} slot tersisa
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(challenge.current_participants / challenge.max_participants) * 100}%`
                      }}
                    ></div>
                  </div>

                  {/* Days until start */}
                  {challenge.days_until_start > 0 && (
                    <div className="text-center text-sm text-gray-600 mb-4">
                      {challenge.days_until_start} hari lagi dimulai
                    </div>
                  )}

                  {/* Action Button */}
                  <Link
                    href={`/fit-challenge/${challenge.id}`}
                    className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                      challenge.registration_open && challenge.spots_remaining > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {challenge.registration_open && challenge.spots_remaining > 0
                      ? 'Daftar Sekarang'
                      : challenge.spots_remaining <= 0
                      ? 'Challenge Penuh'
                      : 'Pendaftaran Ditutup'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Siap Mengubah Hidup Anda?
          </h2>
          <p className="text-xl mb-6 opacity-90">
            Bergabunglah dengan ribuan anggota Koperasi Sinoman yang sudah merasakan manfaatnya!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/fit-challenge/about"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Pelajari Lebih Lanjut
            </Link>
            <Link
              href="/dashboard"
              className="border-2 border-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition-colors"
            >
              Dashboard Saya
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}