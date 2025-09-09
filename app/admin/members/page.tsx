'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Member, SavingsAccount } from '@/types/database.types'

interface MemberWithSavings extends Member {
  savings_account?: SavingsAccount
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberWithSavings[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all')
  const [selectedMember, setSelectedMember] = useState<MemberWithSavings | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      
      const { data: memberData, error } = await supabase
        .from('members')
        .select(`
          *,
          savings_account:savings_accounts (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMembers(memberData || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', memberId)

      if (error) throw error

      // Update local state
      setMembers(members.map(member => 
        member.id === memberId 
          ? { ...member, status: newStatus as typeof member.status }
          : member
      ))

      alert('Status anggota berhasil diperbarui')
    } catch (error) {
      console.error('Error updating member status:', error)
      alert('Gagal memperbarui status anggota')
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
    return new Date(date).toLocaleDateString('id-ID')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      suspended: 'Ditangguhkan'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || colors.inactive}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  // Filter members based on search and status
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.member_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Paginate results
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Anggota</h1>
        <div className="text-sm text-gray-600">
          Total: {members.length} anggota
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Anggota
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama, nomor anggota, atau email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setCurrentPage(1)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontak
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Simpanan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bergabung
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{member.full_name}</div>
                      <div className="text-sm text-gray-500">{member.member_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.email || '-'}</div>
                    <div className="text-sm text-gray-500">{member.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {member.savings_account ? 
                        formatCurrency(member.savings_account.total_balance) : 
                        'Belum ada'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.join_date ? formatDate(member.join_date) : formatDate(member.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMember(member)
                          setShowDetails(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Detail
                      </button>
                      
                      <div className="relative group">
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                          <div className="py-1">
                            {member.status !== 'active' && (
                              <button
                                onClick={() => updateMemberStatus(member.id, 'active')}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Aktifkan
                              </button>
                            )}
                            {member.status !== 'inactive' && (
                              <button
                                onClick={() => updateMemberStatus(member.id, 'inactive')}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Nonaktifkan
                              </button>
                            )}
                            {member.status !== 'suspended' && (
                              <button
                                onClick={() => updateMemberStatus(member.id, 'suspended')}
                                className="block px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                              >
                                Tangguhkan
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMembers.length)} dari {filteredMembers.length} anggota
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {showDetails && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Detail Anggota</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nama Lengkap</label>
                    <p className="text-gray-900">{selectedMember.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nomor Anggota</label>
                    <p className="text-gray-900">{selectedMember.member_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedMember.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Telepon</label>
                    <p className="text-gray-900">{selectedMember.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">NIK</label>
                    <p className="text-gray-900">{selectedMember.id_card_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedMember.status)}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Alamat</label>
                  <p className="text-gray-900">
                    {selectedMember.address || '-'}
                    {selectedMember.rt && selectedMember.rw && 
                      `, RT ${selectedMember.rt}/RW ${selectedMember.rw}`
                    }
                    {selectedMember.village && `, ${selectedMember.village}`}
                    {selectedMember.district && `, ${selectedMember.district}`}
                  </p>
                </div>

                {/* Savings Info */}
                {selectedMember.savings_account && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Informasi Simpanan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Simpanan Pokok</label>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(selectedMember.savings_account.pokok_balance)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Simpanan Wajib</label>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(selectedMember.savings_account.wajib_balance)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Simpanan Sukarela</label>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(selectedMember.savings_account.sukarela_balance)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Total Simpanan</label>
                        <p className="font-bold text-green-600">
                          {formatCurrency(selectedMember.savings_account.total_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => updateMemberStatus(selectedMember.id, 
                      selectedMember.status === 'active' ? 'inactive' : 'active'
                    )}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedMember.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}