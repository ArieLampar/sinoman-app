import LoginForm from '@/components/auth/login-form'
import { Suspense } from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masuk - Koperasi Sinoman',
  description: 'Masuk ke akun Koperasi Sinoman untuk mengakses layanan simpan pinjam, bank sampah, dan e-commerce.',
}

function LoadingForm() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
      </div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  )
}

function SuccessMessage({ message }: { message: string }) {
  const messages = {
    'registration-success': {
      title: 'Pendaftaran Berhasil!',
      description: 'Akun Anda telah berhasil dibuat. Silakan masuk dengan email dan password yang sudah Anda daftarkan.',
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  const messageData = messages[message as keyof typeof messages]
  
  if (!messageData) return null

  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          {messageData.icon}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">
            {messageData.title}
          </h3>
          <div className="mt-2 text-sm text-green-700">
            {messageData.description}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  
  return (
    <>
      {params.message && <SuccessMessage message={params.message} />}
      <Suspense fallback={<LoadingForm />}>
        <LoginForm />
      </Suspense>
    </>
  )
}