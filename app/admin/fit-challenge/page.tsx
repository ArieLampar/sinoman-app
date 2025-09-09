'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import Link from 'next/link'

type FitChallenge = Database['public']['Tables']['fit_challenges']['Row']
type FitParticipant = Database['public']['Tables']['fit_participants']['Row']

interface ChallengeWithStats extends FitChallenge {
  spots_remaining: number
  participants?: FitParticipant[]
  total_revenue?: number
}

export default function AdminFitChallengePage() {
  const [challenges, setChallenges] = useState<ChallengeWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchChallenges()
  }, [filter])

  const fetchChallenges = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fit-challenge?status=${filter === 'all' ? 'active' : filter}&limit=50`)
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

  const handleCreateChallenge = async (formData: any) => {
    try {
      const response = await fetch('/api/fit-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        alert('Challenge berhasil dibuat!')
        setShowCreateForm(false)
        fetchChallenges()
      } else {
        alert(data.error || 'Gagal membuat challenge')
      }
    } catch (error) {
      console.error('Create challenge error:', error)
      alert('Terjadi kesalahan saat membuat challenge')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
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

  const getStatusBadge = (status: string) => {
    const styles = {
      upcoming: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      upcoming: 'Akan Datang',
      active: 'Sedang Berjalan',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Fit Challenge</h1>
          <p className="text-gray-600">Kelola program Fit Challenge Koperasi Sinoman</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Buat Challenge Baru
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Challenges</p>
              <p className="text-2xl font-bold text-gray-900">{challenges.length}</p>
            </div>
            <div className="text-3xl">🏃‍♂️</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Sedang Aktif</p>
              <p className="text-2xl font-bold text-green-600">
                {challenges.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Peserta</p>
              <p className="text-2xl font-bold text-blue-600">
                {challenges.reduce((sum, c) => sum + c.current_participants, 0)}
              </p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Estimasi Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(challenges.reduce((sum, c) => sum + (c.registration_fee * c.current_participants), 0))}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'upcoming', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'all' ? 'Semua' : 
             tab === 'upcoming' ? 'Akan Datang' : 
             tab === 'active' ? 'Aktif' : 'Selesai'}
          </button>
        ))}
      </div>

      {/* Challenges Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Challenge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peserta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : challenges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Belum ada challenge
                  </td>
                </tr>
              ) : (
                challenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {challenge.challenge_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Batch #{challenge.batch_number} • {challenge.challenge_code}
                          </div>
                          {challenge.trainer_name && (
                            <div className="text-xs text-gray-400">
                              Trainer: {challenge.trainer_name}
                            </div>
                          )}
                        </div>
                        {challenge.featured && (
                          <span className="ml-2 text-yellow-500">⭐</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(challenge.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{formatDate(challenge.start_date)}</div>
                      <div className="text-xs text-gray-500">
                        s/d {formatDate(challenge.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {challenge.current_participants}/{challenge.max_participants}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(challenge.current_participants / challenge.max_participants) * 100}%`
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(challenge.registration_fee * challenge.current_participants)}
                      <div className="text-xs text-gray-500">
                        @{formatCurrency(challenge.registration_fee)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/fit-challenge/${challenge.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Detail
                        </Link>
                        <Link
                          href={`/admin/fit-challenge/${challenge.id}/participants`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Peserta
                        </Link>
                        <Link
                          href={`/admin/fit-challenge/${challenge.id}/leaderboard`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Ranking
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Challenge Modal */}
      {showCreateForm && (
        <CreateChallengeModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateChallenge}
        />
      )}
    </div>
  )
}

// Create Challenge Modal Component
function CreateChallengeModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void
  onSubmit: (data: any) => void 
}) {
  const [formData, setFormData] = useState({
    challenge_name: '',
    description: '',
    batch_number: 1,
    start_date: '',
    end_date: '',
    registration_deadline: '',
    registration_fee: 600000,
    max_participants: 50,
    trainer_name: '',
    trainer_phone: '',
    location: '',
    schedule_days: 'mon,wed,fri',
    schedule_time: '18:00',
    requirements: '',
    prizes_info: '',
    rules_regulation: '',
    featured: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Buat Challenge Baru</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Challenge *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.challenge_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, challenge_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.batch_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, batch_number: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Mulai *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Selesai *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batas Pendaftaran *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.registration_deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_deadline: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biaya Pendaftaran (Rp)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.registration_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_fee: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Peserta
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.max_participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Trainer *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.trainer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainer_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="featured"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.featured}
                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
              />
              <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                Jadikan challenge unggulan
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buat Challenge
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}