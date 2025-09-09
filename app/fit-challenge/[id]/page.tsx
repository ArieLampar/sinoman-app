'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Image from 'next/image'
import Link from 'next/link'

type FitChallenge = Database['public']['Tables']['fit_challenges']['Row']
type FitParticipant = Database['public']['Tables']['fit_participants']['Row']

interface ChallengeDetails extends FitChallenge {
  spots_remaining: number
  registration_open: boolean
  days_until_start: number
}

interface RegistrationData {
  initial_measurements: {
    weight?: number
    height?: number
    body_fat?: number
    target_weight?: number
    notes?: string
  }
  health_info: {
    conditions?: string
    motivation?: string
  }
  emergency_contact: {
    name?: string
    phone?: string
  }
}

export default function ChallengeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const challengeId = params.id as string
  
  const [challenge, setChallenge] = useState<ChallengeDetails | null>(null)
  const [userRegistration, setUserRegistration] = useState<FitParticipant | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    initial_measurements: {},
    health_info: {},
    emergency_contact: {}
  })

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (challengeId) {
      fetchChallengeDetails()
      checkUserRegistration()
    }
  }, [challengeId])

  const fetchChallengeDetails = async () => {
    try {
      const response = await fetch(`/api/fit-challenge?status=all&limit=1`)
      const data = await response.json()
      
      if (data.success) {
        const challengeData = data.data.find((c: ChallengeDetails) => c.id === challengeId)
        setChallenge(challengeData || null)
      }
    } catch (error) {
      console.error('Error fetching challenge:', error)
    }
  }

  const checkUserRegistration = async () => {
    try {
      const response = await fetch('/api/fit-challenge/register')
      const data = await response.json()
      
      if (data.success) {
        const registration = data.data.find((reg: any) => 
          reg.challenge_id === challengeId
        )
        setUserRegistration(registration || null)
      }
    } catch (error) {
      console.error('Error checking registration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegistering(true)

    try {
      const response = await fetch('/api/fit-challenge/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challenge_id: challengeId,
          ...registrationData
        }),
      })

      const data = await response.json()

      if (data.success) {
        setUserRegistration(data.data.participant)
        setShowRegistrationForm(false)
        alert('Pendaftaran berhasil! Silakan lakukan pembayaran untuk mengkonfirmasi.')
      } else {
        alert(data.error || 'Pendaftaran gagal')
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('Terjadi kesalahan saat mendaftar')
    } finally {
      setRegistering(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Challenge tidak ditemukan</h1>
          <Link href="/fit-challenge" className="text-blue-600 hover:underline">
            Kembali ke daftar challenge
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-blue-600 to-purple-600">
        {challenge.photo_url && (
          <Image
            src={challenge.photo_url}
            alt={challenge.challenge_name}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <div className="flex items-center gap-4 mb-4">
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                Batch #{challenge.batch_number}
              </span>
              {challenge.featured && (
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
                  ⭐ Featured
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {challenge.challenge_name}
            </h1>
            <p className="text-xl md:text-2xl mb-6 opacity-90">
              Program transformasi 8 minggu untuk hidup yang lebih sehat
            </p>
            <div className="flex items-center gap-8">
              <div>
                <div className="text-sm opacity-75">Biaya Pendaftaran</div>
                <div className="text-3xl font-bold">{formatCurrency(challenge.registration_fee)}</div>
              </div>
              <div>
                <div className="text-sm opacity-75">Sisa Slot</div>
                <div className="text-3xl font-bold">{challenge.spots_remaining}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            {challenge.description && (
              <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Tentang Challenge</h2>
                <p className="text-gray-600 leading-relaxed">{challenge.description}</p>
              </div>
            )}

            {/* Schedule & Details */}
            <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detail Program</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📅 Jadwal</h3>
                  <div className="space-y-2 text-gray-600">
                    <div>Mulai: {formatDate(challenge.start_date)}</div>
                    <div>Selesai: {formatDate(challenge.end_date)}</div>
                    <div>Batas Daftar: {formatDate(challenge.registration_deadline)}</div>
                    {challenge.schedule_days && challenge.schedule_time && (
                      <div>Latihan: {challenge.schedule_days.toUpperCase()} jam {challenge.schedule_time}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">👨‍🏫 Trainer & Lokasi</h3>
                  <div className="space-y-2 text-gray-600">
                    {challenge.trainer_name && <div>Trainer: {challenge.trainer_name}</div>}
                    {challenge.location && <div>Lokasi: {challenge.location}</div>}
                    <div>Max Peserta: {challenge.max_participants} orang</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {challenge.requirements && (
              <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Persyaratan</h2>
                <div className="text-gray-600 whitespace-pre-line">
                  {challenge.requirements}
                </div>
              </div>
            )}

            {/* Prizes */}
            {challenge.prizes_info && (
              <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 Hadiah & Rewards</h2>
                <div className="text-gray-600">
                  {typeof challenge.prizes_info === 'string' 
                    ? challenge.prizes_info 
                    : JSON.stringify(challenge.prizes_info, null, 2)
                  }
                </div>
              </div>
            )}

            {/* Rules */}
            {challenge.rules_regulation && (
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Aturan & Ketentuan</h2>
                <div className="text-gray-600 whitespace-pre-line">
                  {challenge.rules_regulation}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Registration Card */}
            <div className="bg-white rounded-xl p-8 shadow-sm sticky top-8">
              {userRegistration ? (
                /* Already Registered */
                <div className="text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-green-600 mb-2">
                    Sudah Terdaftar!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Nomor Registrasi: {userRegistration.registration_number}
                  </p>
                  <div className="space-y-3">
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      userRegistration.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Payment: {userRegistration.payment_status === 'paid' ? 'Lunas' : 'Pending'}
                    </div>
                    <Link
                      href={`/fit-challenge/${challengeId}/dashboard`}
                      className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Dashboard Saya
                    </Link>
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Daftar Challenge</h3>
                  
                  {!showRegistrationForm ? (
                    <div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                          <span>Biaya Pendaftaran</span>
                          <span className="font-bold">{formatCurrency(challenge.registration_fee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Slot Tersisa</span>
                          <span className="font-bold">{challenge.spots_remaining}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowRegistrationForm(true)}
                        disabled={!challenge.registration_open || challenge.spots_remaining <= 0}
                        className={`w-full py-3 rounded-lg font-medium transition-colors ${
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
                      </button>
                    </div>
                  ) : (
                    /* Registration Form */
                    <form onSubmit={handleRegistration} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Berat Badan Saat Ini (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={registrationData.initial_measurements.weight || ''}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            initial_measurements: {
                              ...prev.initial_measurements,
                              weight: parseFloat(e.target.value) || undefined
                            }
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tinggi Badan (cm)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={registrationData.initial_measurements.height || ''}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            initial_measurements: {
                              ...prev.initial_measurements,
                              height: parseFloat(e.target.value) || undefined
                            }
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Berat Badan (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={registrationData.initial_measurements.target_weight || ''}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            initial_measurements: {
                              ...prev.initial_measurements,
                              target_weight: parseFloat(e.target.value) || undefined
                            }
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kondisi Kesehatan
                        </label>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Ceritakan kondisi kesehatan Anda..."
                          value={registrationData.health_info.conditions || ''}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            health_info: {
                              ...prev.health_info,
                              conditions: e.target.value
                            }
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kontak Darurat
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Nama"
                          value={registrationData.emergency_contact.name || ''}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            emergency_contact: {
                              ...prev.emergency_contact,
                              name: e.target.value
                            }
                          }))}
                        />
                        <input
                          type="tel"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nomor Telepon"
                          value={registrationData.emergency_contact.phone || ''}
                          onChange={(e) => setRegistrationData(prev => ({
                            ...prev,
                            emergency_contact: {
                              ...prev.emergency_contact,
                              phone: e.target.value
                            }
                          }))}
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowRegistrationForm(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={registering}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {registering ? 'Mendaftar...' : 'Daftar'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}