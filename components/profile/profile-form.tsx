'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateMemberProfile, createMemberProfile } from '@/lib/profile/actions'
import PhotoUpload from './photo-upload'
import type { Member } from '@/types/database.types'

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  id_card_number: z.string().length(16, 'NIK harus 16 digit').regex(/^\d+$/, 'NIK harus berupa angka'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').regex(/^\d+$/, 'Nomor telepon harus berupa angka'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['L', 'P']).optional(),
  occupation: z.string().optional(),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  rt: z.string().optional(),
  rw: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  initialData: Member | null
  userId: string
}

export default function ProfileForm({ initialData, userId }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      id_card_number: initialData?.id_card_number || '',
      phone: initialData?.phone || '',
      date_of_birth: initialData?.date_of_birth || '',
      gender: initialData?.gender || undefined,
      occupation: initialData?.occupation || '',
      address: initialData?.address || '',
      rt: initialData?.rt || '',
      rw: initialData?.rw || '',
      village: initialData?.village || '',
      district: initialData?.district || '',
    },
  })

  const onSubmit = handleSubmit((data) => {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        let result
        if (initialData) {
          result = await updateMemberProfile(initialData.id, data)
        } else {
          result = await createMemberProfile(userId, data)
        }

        if (result.error) {
          setError(result.error)
        } else {
          setSuccess(true)
          setTimeout(() => {
            router.refresh()
          }, 1500)
        }
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="text-sm">Profil berhasil disimpan!</p>
        </div>
      )}

      {/* Photo Upload */}
      {initialData && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Foto Profil</h3>
          <PhotoUpload 
            memberId={initialData.id}
            currentPhotoUrl={initialData.photo_url}
          />
        </div>
      )}

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informasi Pribadi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap *
            </label>
            <input
              {...register('full_name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Masukkan nama lengkap"
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="id_card_number" className="block text-sm font-medium text-gray-700 mb-1">
              NIK (Nomor Induk Kependudukan) *
            </label>
            <input
              {...register('id_card_number')}
              type="text"
              maxLength={16}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="16 digit NIK"
            />
            {errors.id_card_number && (
              <p className="mt-1 text-sm text-red-600">{errors.id_card_number.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Telepon *
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="08xxxxxxxxxx"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Lahir
            </label>
            <input
              {...register('date_of_birth')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Kelamin
            </label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Pilih Jenis Kelamin</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div>
            <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
              Pekerjaan
            </label>
            <input
              {...register('occupation')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Masukkan pekerjaan"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informasi Alamat</h3>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Alamat Lengkap *
          </label>
          <textarea
            {...register('address')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Masukkan alamat lengkap"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="rt" className="block text-sm font-medium text-gray-700 mb-1">
              RT
            </label>
            <input
              {...register('rt')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="000"
            />
          </div>

          <div>
            <label htmlFor="rw" className="block text-sm font-medium text-gray-700 mb-1">
              RW
            </label>
            <input
              {...register('rw')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="000"
            />
          </div>

          <div>
            <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">
              Kelurahan/Desa
            </label>
            <input
              {...register('village')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Nama kelurahan/desa"
            />
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
              Kecamatan
            </label>
            <input
              {...register('district')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Nama kecamatan"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={isPending}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Menyimpan...
            </span>
          ) : (
            initialData ? 'Simpan Perubahan' : 'Daftarkan Anggota'
          )}
        </button>
      </div>
    </form>
  )
}