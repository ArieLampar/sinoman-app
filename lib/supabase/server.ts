import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// Membuat Supabase client untuk server-side operations
// Client ini digunakan untuk operasi yang dilakukan di server seperti:
// - Server Components
// - API Routes
// - Middleware
// - Server Actions

export const createServerClient = () => {
  const cookieStore = cookies()
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Fungsi untuk mengambil cookie dari request
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // Fungsi untuk menyimpan cookie ke response
        set(name: string, value: string, options) {
          cookieStore.set(name, value, options)
        },
        // Fungsi untuk menghapus cookie
        remove(name: string, options) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}

// Export helper function untuk kemudahan penggunaan
export const supabaseServer = createServerClient