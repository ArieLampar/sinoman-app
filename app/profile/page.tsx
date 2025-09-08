import { getServerUser, getServerMemberData } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/profile/profile-form'
import ProfileDisplay from '@/components/profile/profile-display'
import type { Member, Tenant } from '@/types/database.types'

type MemberWithRelations = Member & {
  tenant?: Tenant | null
}

export default async function ProfilePage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }

  let memberData: MemberWithRelations | null = null
  try {
    memberData = await getServerMemberData(user.id)
  } catch (error) {
    console.error('Error fetching member data:', error)
  }

  const isProfileComplete = memberData && 
    memberData.full_name && 
    memberData.id_card_number && 
    memberData.phone && 
    memberData.address

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
              <h1 className="text-2xl font-bold text-gray-900">Profil Anggota</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Alert */}
        {!isProfileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Profil Belum Lengkap
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Lengkapi profil Anda untuk mengakses semua fitur koperasi.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Display Card */}
          <div className="lg:col-span-1">
            <ProfileDisplay 
              member={memberData} 
              userEmail={user.email || ''} 
            />
          </div>

          {/* Profile Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {memberData ? 'Edit Informasi Profil' : 'Lengkapi Profil Anggota'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {memberData 
                    ? 'Perbarui informasi profil Anda' 
                    : 'Isi data berikut untuk melengkapi registrasi keanggotaan'}
                </p>
              </div>
              <div className="p-6">
                <ProfileForm 
                  initialData={memberData}
                  userId={user.id}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}