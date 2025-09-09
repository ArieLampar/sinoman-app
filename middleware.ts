import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { applyRateLimit, checkSuspiciousActivity } from '@/lib/security/rate-limiter'
import { securityConfig } from '@/config/security'
import auditLogger from '@/lib/audit/logger'

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

// Routes yang memerlukan rate limiting khusus
const apiRoutes = [
  '/api/auth',
  '/api/upload'
]

export async function middleware(request: NextRequest) {
  // Generate request ID untuk tracing
  const requestId = crypto.randomUUID()
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Add security headers
  Object.entries(securityConfig.securityHeaders).forEach(([key, value]) => {
    supabaseResponse.headers.set(key, value)
  })

  // Check for suspicious activity
  const suspiciousCheck = await checkSuspiciousActivity(request)
  if (suspiciousCheck.isSuspicious) {
    await auditLogger.logSecurityEvent({
      type: 'suspicious_activity',
      severity: suspiciousCheck.severity || 'medium',
      description: suspiciousCheck.reason || 'Suspicious activity detected',
      ip_address: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      details: {
        path: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent'),
        method: request.method,
        query: request.nextUrl.search
      }
    }, {
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      requestId
    })

    // Block high severity suspicious activities
    if (suspiciousCheck.severity === 'high') {
      return new NextResponse(
        JSON.stringify({
          error: 'Blocked: Suspicious activity detected',
          code: 'SECURITY_BLOCK'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(Object.entries(securityConfig.securityHeaders))
          }
        }
      )
    }
  }

  // Apply rate limiting untuk API routes
  const pathname = request.nextUrl.pathname
  let rateLimitContext: 'general' | 'auth' | 'admin' | 'upload' = 'general'
  
  if (pathname.startsWith('/api/auth')) {
    rateLimitContext = 'auth'
  } else if (pathname.startsWith('/admin')) {
    rateLimitContext = 'admin'
  } else if (pathname.startsWith('/api/upload')) {
    rateLimitContext = 'upload'
  }
  
  // Apply rate limiting untuk API dan admin routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/admin/')) {
    const rateLimitResult = await applyRateLimit(request, rateLimitContext)
    
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: rateLimitResult.error,
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitResult.headers,
            ...Object.fromEntries(Object.entries(securityConfig.securityHeaders))
          }
        }
      )
    }
    
    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      supabaseResponse.headers.set(key, value)
    })
  }

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
  
  // Log authentication access attempts
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

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
    // Log unauthorized access attempt
    await auditLogger.logSecurityEvent({
      type: 'permission_denied',
      severity: 'low',
      description: `Unauthorized access attempt to ${isAdminRoute ? 'admin' : 'protected'} route`,
      details: {
        attemptedRoute: pathname,
        userAgent,
        isAdminRoute,
        isProtectedRoute
      }
    }, {
      ip: clientIP,
      userAgent,
      requestId
    })
    
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