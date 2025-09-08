import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  
  // Sign out
  await supabase.auth.signOut()
  
  // Revalidate the layout to update the auth state
  revalidatePath('/', 'layout')
  
  // Redirect to login page
  redirect('/login')
}