'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { registerAction, getAvailableTenants } from '@/lib/auth/actions'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Tenant = {
  id: string
  tenant_name: string
  tenant_code: string
  tenant_type: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Mendaftarkan...
        </div>
      ) : (
        'Daftar Sekarang'
      )}
    </button>
  )
}

export default function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, { errors: {} })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const router = useRouter()

  // Load tenants
  useEffect(() => {
    const loadTenants = async () => {
      const data = await getAvailableTenants()
      setTenants(data)
    }
    loadTenants()
  }, [])

  // Redirect on successful registration
  useEffect(() => {
    if (state.success) {
      router.push('/login?message=registration-success')
    }
  }, [state.success, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Daftar Anggota Baru
        </h2>
        <p className="text-gray-600">
          Lengkapi data diri untuk bergabung dengan koperasi
        </p>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-4">
        
        {/* Tenant Selection */}
        <div>
          <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Koperasi <span className="text-red-500">*</span>
          </label>
          <select
            id="tenantId"
            name="tenantId"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            required
          >
            <option value="">-- Pilih Koperasi --</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.tenant_name} ({tenant.tenant_code})
              </option>
            ))}
          </select>
          {state.errors?.tenantId && (
            <p className="mt-1 text-sm text-red-600">{state.errors.tenantId[0]}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="email@example.com"
            required
          />
          {state.errors?.email && (
            <p className="mt-1 text-sm text-red-600">{state.errors.email[0]}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="w-full px-3 py-2 pr-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
              placeholder="Minimal 6 karakter"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {state.errors?.password && (
            <p className="mt-1 text-sm text-red-600">{state.errors.password[0]}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Konfirmasi Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              className="w-full px-3 py-2 pr-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
              placeholder="Ulangi password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {state.errors?.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{state.errors.confirmPassword[0]}</p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="Nama lengkap sesuai KTP"
            required
          />
          {state.errors?.fullName && (
            <p className="mt-1 text-sm text-red-600">{state.errors.fullName[0]}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Nomor HP <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="08123456789"
            required
          />
          {state.errors?.phone && (
            <p className="mt-1 text-sm text-red-600">{state.errors.phone[0]}</p>
          )}
        </div>

        {/* ID Card Number */}
        <div>
          <label htmlFor="idCardNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Nomor KTP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="idCardNumber"
            name="idCardNumber"
            maxLength={16}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="16 digit nomor KTP"
            required
          />
          {state.errors?.idCardNumber && (
            <p className="mt-1 text-sm text-red-600">{state.errors.idCardNumber[0]}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Lahir <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            required
          />
          {state.errors?.dateOfBirth && (
            <p className="mt-1 text-sm text-red-600">{state.errors.dateOfBirth[0]}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jenis Kelamin <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="L"
                className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-600"
                required
              />
              <span className="ml-2 text-sm text-gray-800">Laki-laki</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="P"
                className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-600"
                required
              />
              <span className="ml-2 text-sm text-gray-800">Perempuan</span>
            </label>
          </div>
          {state.errors?.gender && (
            <p className="mt-1 text-sm text-red-600">{state.errors.gender[0]}</p>
          )}
        </div>

        {/* Occupation */}
        <div>
          <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
            Pekerjaan
          </label>
          <input
            type="text"
            id="occupation"
            name="occupation"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="Pekerjaan (opsional)"
          />
          {state.errors?.occupation && (
            <p className="mt-1 text-sm text-red-600">{state.errors.occupation[0]}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Alamat Lengkap <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500 resize-none"
            placeholder="Alamat lengkap sesuai KTP"
            required
          />
          {state.errors?.address && (
            <p className="mt-1 text-sm text-red-600">{state.errors.address[0]}</p>
          )}
        </div>

        {/* Referral Code */}
        <div>
          <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1">
            Kode Referral
          </label>
          <input
            type="text"
            id="referralCode"
            name="referralCode"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="Kode referral (opsional)"
          />
          {state.errors?.referralCode && (
            <p className="mt-1 text-sm text-red-600">{state.errors.referralCode[0]}</p>
          )}
        </div>

        {/* Form Errors */}
        {state.errors?._form && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              {state.errors._form[0]}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <SubmitButton />
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">atau</span>
        </div>
      </div>

      {/* Login Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link 
            href="/login" 
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Masuk Sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}