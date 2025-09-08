import RegisterForm from '@/components/auth/register-form'
import { Suspense } from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Daftar Anggota - Koperasi Sinoman',
  description: 'Daftar sebagai anggota Koperasi Sinoman untuk mengakses layanan simpan pinjam, bank sampah, fit challenge, dan e-commerce.',
}

function LoadingForm() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
      </div>
      
      {/* Progress Steps Skeleton */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            {step < 3 && (
              <div className="w-full h-0.5 mx-2 bg-gray-200 animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Form Fields Skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="flex justify-between pt-4">
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingForm />}>
      <RegisterForm />
    </Suspense>
  )
}