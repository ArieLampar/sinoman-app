// lib/security/rate-limiter.ts
// Rate limiting system untuk Sinoman SuperApp

import { NextRequest } from 'next/server'
import { securityConfig } from '@/config/security'
import auditLogger from '@/lib/audit/logger'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
  lastRequest: number
}

// In-memory store untuk development, production sebaiknya gunakan Redis
class MemoryStore {
  private store: Map<string, RateLimitEntry> = new Map()

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    
    // Hapus entry yang sudah expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key)
      return null
    }
    
    return entry
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  // Cleanup expired entries
  async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

class RateLimiter {
  private store: MemoryStore

  constructor() {
    this.store = new MemoryStore()
    
    // Cleanup expired entries setiap 5 menit
    if (typeof window === 'undefined') { // Only on server
      setInterval(() => {
        this.store.cleanup()
      }, 5 * 60 * 1000)
    }
  }

  /**
   * Check apakah request masih dalam limit
   */
  async checkLimit(identifier: string, config: RateLimitConfig): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    totalHits: number
  }> {
    const now = Date.now()
    const resetTime = now + config.windowMs
    
    let entry = await this.store.get(identifier)
    
    if (!entry) {
      // First request dalam window
      entry = {
        count: 1,
        resetTime,
        lastRequest: now
      }
      await this.store.set(identifier, entry)
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
        totalHits: 1
      }
    }

    // Increment counter
    entry.count++
    entry.lastRequest = now
    await this.store.set(identifier, entry)

    const allowed = entry.count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - entry.count)

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalHits: entry.count
    }
  }

  /**
   * Get rate limit status without incrementing
   */
  async getStatus(identifier: string): Promise<RateLimitEntry | null> {
    return await this.store.get(identifier)
  }

  /**
   * Reset rate limit untuk identifier tertentu
   */
  async reset(identifier: string): Promise<void> {
    await this.store.delete(identifier)
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

/**
 * Get IP address dari request
 */
function getClientIP(request: NextRequest): string {
  // Check headers untuk IP forwarding
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (xRealIP) return xRealIP
  if (xForwardedFor) {
    // X-Forwarded-For bisa berisi multiple IPs, ambil yang pertama
    return xForwardedFor.split(',')[0].trim()
  }
  
  // Fallback ke IP dari connection
  return request.ip || 'unknown'
}

/**
 * Generate rate limit identifier berdasarkan context
 */
function getRateLimitKey(request: NextRequest, context: string = 'general'): string {
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const path = request.nextUrl.pathname
  
  // Untuk auth endpoints, gunakan IP saja
  if (context === 'auth') {
    return `auth:${ip}`
  }
  
  // Untuk admin endpoints, gunakan IP + user agent untuk keamanan extra
  if (context === 'admin') {
    const userAgentHash = Buffer.from(userAgent).toString('base64').slice(0, 10)
    return `admin:${ip}:${userAgentHash}`
  }
  
  // Untuk file upload, gunakan IP + path
  if (context === 'upload') {
    return `upload:${ip}:${path}`
  }
  
  // General rate limit berdasarkan IP
  return `general:${ip}`
}

/**
 * Rate limiting middleware untuk API routes
 */
export async function applyRateLimit(
  request: NextRequest, 
  context: 'general' | 'auth' | 'admin' | 'upload' = 'general'
): Promise<{
  success: boolean
  headers: Record<string, string>
  error?: string
}> {
  const config = securityConfig.rateLimit[context]
  const identifier = getRateLimitKey(request, context)
  
  try {
    const result = await rateLimiter.checkLimit(identifier, config)
    
    const headers = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    }
    
    if (!result.allowed) {
      // Log rate limit exceeded
      await auditLogger.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Rate limit exceeded for ${context}`,
        ip_address: getClientIP(request),
        details: {
          context,
          totalHits: result.totalHits,
          limit: config.maxRequests,
          windowMs: config.windowMs,
          userAgent: request.headers.get('user-agent'),
          path: request.nextUrl.pathname
        }
      }, {
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      return {
        success: false,
        headers: {
          ...headers,
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
        error: `Rate limit exceeded. Max ${config.maxRequests} requests per ${Math.ceil(config.windowMs / 1000)} seconds.`
      }
    }
    
    return {
      success: true,
      headers
    }
  } catch (error) {
    console.error('[RATE_LIMITER] Error checking rate limit:', error)
    
    // Jika ada error, allow request (fail open untuk availability)
    return {
      success: true,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
        'X-RateLimit-Reset': Math.ceil((Date.now() + config.windowMs) / 1000).toString(),
      }
    }
  }
}

/**
 * Higher-order function untuk wrap API handler dengan rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  context: 'general' | 'auth' | 'admin' | 'upload' = 'general'
) {
  return async (req: NextRequest, ...args: any[]): Promise<Response> => {
    const result = await applyRateLimit(req, context)
    
    if (!result.success) {
      const response = new Response(
        JSON.stringify({
          error: result.error,
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.headers
          }
        }
      )
      return response
    }
    
    // Execute handler
    const response = await handler(req, ...args)
    
    // Add rate limit headers to response
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}

/**
 * Check suspicious activity berdasarkan pattern request
 */
export async function checkSuspiciousActivity(request: NextRequest): Promise<{
  isSuspicious: boolean
  reason?: string
  severity?: 'low' | 'medium' | 'high'
}> {
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  
  // Pattern suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scanner/i,
    /curl/i,
    /wget/i,
    /python/i
  ]
  
  // Check user agent
  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      return {
        isSuspicious: true,
        reason: 'Suspicious user agent detected',
        severity: 'low'
      }
    }
  }
  
  // Check untuk SQL injection patterns dalam query
  const queryString = request.nextUrl.search
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /union.*select/i,
    /select.*from/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i
  ]
  
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(queryString) || pattern.test(path)) {
      return {
        isSuspicious: true,
        reason: 'Potential SQL injection attempt',
        severity: 'high'
      }
    }
  }
  
  // Check untuk XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i
  ]
  
  for (const pattern of xssPatterns) {
    if (pattern.test(queryString) || pattern.test(path)) {
      return {
        isSuspicious: true,
        reason: 'Potential XSS attempt',
        severity: 'high'
      }
    }
  }
  
  // Check untuk path traversal
  if (path.includes('..') || path.includes('%2e%2e')) {
    return {
      isSuspicious: true,
      reason: 'Potential path traversal attempt',
      severity: 'high'
    }
  }
  
  return {
    isSuspicious: false
  }
}

export { rateLimiter, getClientIP, getRateLimitKey }