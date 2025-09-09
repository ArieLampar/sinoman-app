import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes yang memerlukan autentikasi
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/savings',
  '/waste',
  '/orders',
  '/products',
  '/transactions',
  '/fit-challenge',
  '/notifications',
  '/settings'
]

// Routes khusus admin
const adminRoutes = [
  '/admin',
  '/admin/dashboard',
  '/admin/members',
  '/admin/transactions',
  '/admin/reports',
  '/admin/settings'
]

// Routes yang hanya bisa diakses jika belum login
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password'
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session jika sudah kadaluarsa
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Redirect root to appropriate page
  if (pathname === '/') {
    if (user) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    } else {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // If user is not logged in and trying to access protected route
  if (!user && (isProtectedRoute || isAdminRoute)) {
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth routes
  if (user && isAuthRoute) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Check admin access for admin routes
  if (isAdminRoute && user) {
    try {
      // Check if user is an admin
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('id', user.id)
        .eq('is_active', true)
        .single()

      if (error || !adminUser) {
        // User is not an admin, redirect to dashboard
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}