import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Mengambil URL dan API key dari environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Membuat Supabase client untuk digunakan di browser/client side
// Client ini akan digunakan untuk operasi yang dilakukan di browser seperti:
// - Authentication (login, logout, signup)
// - Real-time subscriptions
// - Client-side data fetching
export const supabase = createClient<Database>(supabaseUrl, supabaseKey)