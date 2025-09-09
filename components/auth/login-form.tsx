'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from '@/lib/auth/actions'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
          Masuk...
        </div>
      ) : (
        'Masuk'
      )}
    </button>
  )
}

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, { errors: {} })
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Redirect on successful login
  useEffect(() => {
    if (state.success) {
      router.push('/dashboard')
    }
  }, [state.success, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Masuk ke Akun Anda
        </h2>
        <p className="text-gray-600">
          Masukkan email/HP dan password untuk melanjutkan
        </p>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-4">
        {/* Email or Phone Field */}
        <div>
          <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Email atau Nomor HP
          </label>
          <input
            type="text"
            id="emailOrPhone"
            name="emailOrPhone"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
            placeholder="email@example.com atau 0812345678"
          />
          {state.errors?.emailOrPhone && (
            <p className="mt-1 text-sm text-red-600">
              {state.errors.emailOrPhone[0]}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className="w-full px-3 py-2 pr-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
              placeholder="Masukkan password"
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
            <p className="mt-1 text-sm text-red-600">
              {state.errors.password[0]}
            </p>
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

        {/* Forgot Password Link */}
        <div className="text-right">
          <Link 
            href="/forgot-password" 
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Lupa Password?
          </Link>
        </div>

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

      {/* Register Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link 
            href="/register" 
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Daftar Sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}