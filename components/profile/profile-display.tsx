'use client'

import { useState } from 'react'
import type { Member, Tenant } from '@/types/database.types'

type MemberWithRelations = Member & {
  tenant?: Tenant | null
}

interface ProfileDisplayProps {
  member: MemberWithRelations | null
  userEmail: string
}

export default function ProfileDisplay({ member, userEmail }: ProfileDisplayProps) {
  const [imageError, setImageError] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Informasi Anggota</h2>
      </div>
      
      <div className="p-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {member?.photo_url && !imageError ? (
              <img
                src={member.photo_url}
                alt={member.full_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200">
                {getInitials(member?.full_name || userEmail)}
              </div>
            )}
            {member?.status === 'active' && (
              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-2 border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <h3 className="mt-4 text-xl font-semibold text-gray-900">
            {member?.full_name || 'Belum Diisi'}
          </h3>
          
          <p className="text-sm text-gray-600">{userEmail}</p>
          
          {member && (
            <span className={`mt-2 inline-flex px-3 py-1 text-xs font-medium rounded-full ${
              member.status === 'active' 
                ? 'bg-green-100 text-green-800'
                : member.status === 'suspended'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {member.status === 'active' ? 'Aktif' : 
               member.status === 'suspended' ? 'Ditangguhkan' : 'Tidak Aktif'}
            </span>
          )}
        </div>

        {/* Member Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">No. Anggota</span>
            <span className="text-sm font-medium text-gray-900">
              {member?.member_number || '-'}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">Koperasi</span>
            <span className="text-sm font-medium text-gray-900">
              {member?.tenant?.tenant_name || '-'}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">Tanggal Bergabung</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(member?.join_date)}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">Kode Referral</span>
            <span className="text-sm font-medium text-gray-900">
              {member?.referral_code || '-'}
            </span>
          </div>

          {member?.referred_by && (
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Direferensikan Oleh</span>
              <span className="text-sm font-medium text-gray-900">
                {member.referred_by}
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {member && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Statistik</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600">Member Sejak</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(member.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Terakhir Update</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(member.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}