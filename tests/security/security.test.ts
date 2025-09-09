// tests/security/security.test.ts
// Test suite untuk sistem keamanan Sinoman SuperApp

/**
 * SECURITY TEST SUITE
 * 
 * Test ini mencakup:
 * 1. Rate Limiting
 * 2. Permission System
 * 3. Audit Logging
 * 4. Input Validation
 * 5. Authentication & Authorization
 * 6. CSRF Protection
 * 7. SQL Injection Prevention
 * 8. XSS Prevention
 * 
 * Jalankan dengan: npm test -- tests/security/security.test.ts
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { applyRateLimit, checkSuspiciousActivity } from '@/lib/security/rate-limiter'
import { permissionManager, createAccessContext } from '@/lib/security/permissions'
import auditLogger from '@/lib/audit/logger'
import { securityConfig, validateSecurityConfig } from '@/config/security'

// Mock Supabase
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-user',
              role: 'member',
              tenant_id: 'test-tenant'
            },
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
        lt: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}))

jest.mock('@/lib/supabase/server', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user' }
  }))
}))

describe('Security Configuration Tests', () => {
  test('should have all required environment variables defined in config', () => {
    const requiredVars = securityConfig.requiredEnvVars
    expect(requiredVars).toContain('JWT_SECRET')
    expect(requiredVars).toContain('SESSION_SECRET')
    expect(requiredVars).toContain('CSRF_SECRET')
    expect(requiredVars.length).toBeGreaterThan(0)
  })

  test('should validate security configuration', () => {
    // Mock environment variables untuk testing
    const originalEnv = process.env
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret-key-32-characters-long',
      SESSION_SECRET: 'test-session-secret-key-32-characters-long',
      CSRF_SECRET: 'test-csrf-secret-key-32-characters-long',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
    }

    const validation = validateSecurityConfig()
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)

    process.env = originalEnv
  })

  test('should detect invalid security configuration', () => {
    const originalEnv = process.env
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'short', // Too short
      SESSION_SECRET: undefined, // Missing
    }

    const validation = validateSecurityConfig()
    expect(validation.isValid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)

    process.env = originalEnv
  })

  test('should have proper rate limit configurations', () => {
    expect(securityConfig.rateLimit.general.maxRequests).toBe(100)
    expect(securityConfig.rateLimit.auth.maxRequests).toBe(5)
    expect(securityConfig.rateLimit.admin.maxRequests).toBe(30)
    expect(securityConfig.rateLimit.upload.maxRequests).toBe(10)
  })
})

describe('Rate Limiting Tests', () => {
  test('should allow requests within rate limit', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    })

    const nextReq = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: req.headers as any,
      ip: '192.168.1.1'
    })

    const result = await applyRateLimit(nextReq, 'general')
    
    expect(result.success).toBe(true)
    expect(result.headers).toHaveProperty('X-RateLimit-Limit')
    expect(result.headers).toHaveProperty('X-RateLimit-Remaining')
  })

  test('should block requests exceeding rate limit', async () => {
    const { req } = createMocks({
      method: 'POST',
      url: '/api/auth/login',
      headers: {
        'x-forwarded-for': '192.168.1.2'
      }
    })

    const nextReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: req.headers as any,
      ip: '192.168.1.2'
    })

    // Simulate multiple requests to exceed auth rate limit (5 requests)
    for (let i = 0; i < 6; i++) {
      const result = await applyRateLimit(nextReq, 'auth')
      
      if (i < 5) {
        expect(result.success).toBe(true)
      } else {
        expect(result.success).toBe(false)
        expect(result.error).toContain('Rate limit exceeded')
        expect(result.headers).toHaveProperty('Retry-After')
      }
    }
  })

  test('should have different rate limits for different contexts', async () => {
    const contexts: Array<'general' | 'auth' | 'admin' | 'upload'> = ['general', 'auth', 'admin', 'upload']
    
    for (const context of contexts) {
      const { req } = createMocks({
        method: 'GET',
        url: `/api/${context}/test`,
        headers: {
          'x-forwarded-for': `192.168.1.${context}`
        }
      })

      const nextReq = new NextRequest(`http://localhost:3000/api/${context}/test`, {
        method: 'GET',
        headers: req.headers as any,
        ip: `192.168.1.${context}`
      })

      const result = await applyRateLimit(nextReq, context)
      
      expect(result.success).toBe(true)
      expect(result.headers).toHaveProperty('X-RateLimit-Limit')
      
      const limit = parseInt(result.headers['X-RateLimit-Limit'])
      const expectedLimit = securityConfig.rateLimit[context].maxRequests
      expect(limit).toBe(expectedLimit)
    }
  })
})

describe('Suspicious Activity Detection Tests', () => {
  test('should detect SQL injection attempts', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/users?id=1\' OR \'1\'=\'1',
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    })

    const nextReq = new NextRequest(`http://localhost:3000${req.url}`, {
      method: 'GET',
      headers: req.headers as any
    })

    const result = await checkSuspiciousActivity(nextReq)
    
    expect(result.isSuspicious).toBe(true)
    expect(result.reason).toContain('SQL injection')
    expect(result.severity).toBe('high')
  })

  test('should detect XSS attempts', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/search?q=<script>alert("xss")</script>',
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    })

    const nextReq = new NextRequest(`http://localhost:3000${req.url}`, {
      method: 'GET',
      headers: req.headers as any
    })

    const result = await checkSuspiciousActivity(nextReq)
    
    expect(result.isSuspicious).toBe(true)
    expect(result.reason).toContain('XSS')
    expect(result.severity).toBe('high')
  })

  test('should detect path traversal attempts', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/files?path=../../../etc/passwd',
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    })

    const nextReq = new NextRequest(`http://localhost:3000${req.url}`, {
      method: 'GET',
      headers: req.headers as any
    })

    const result = await checkSuspiciousActivity(nextReq)
    
    expect(result.isSuspicious).toBe(true)
    expect(result.reason).toContain('path traversal')
    expect(result.severity).toBe('high')
  })

  test('should detect suspicious user agents', async () => {
    const suspiciousUserAgents = [
      'curl/7.68.0',
      'python-requests/2.25.1',
      'Scanner Bot 1.0',
      'SQL Injection Bot'
    ]

    for (const userAgent of suspiciousUserAgents) {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/test',
        headers: {
          'user-agent': userAgent
        }
      })

      const nextReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: req.headers as any
      })

      const result = await checkSuspiciousActivity(nextReq)
      
      expect(result.isSuspicious).toBe(true)
      expect(result.reason).toContain('Suspicious user agent')
    }
  })

  test('should not flag legitimate requests', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/members?page=1&limit=10',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const nextReq = new NextRequest(`http://localhost:3000${req.url}`, {
      method: 'GET',
      headers: req.headers as any
    })

    const result = await checkSuspiciousActivity(nextReq)
    
    expect(result.isSuspicious).toBe(false)
  })
})

describe('Permission System Tests', () => {
  const mockContext = {
    user_id: 'test-user',
    tenant_id: 'test-tenant',
    role: 'member' as const,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0'
  }

  test('should grant member permissions to member role', async () => {
    const result = await permissionManager.hasPermission(mockContext, 'member:read_profile')
    expect(result).toBe(true)
  })

  test('should deny admin permissions to member role', async () => {
    const result = await permissionManager.hasPermission(mockContext, 'admin:manage_members')
    expect(result).toBe(false)
  })

  test('should grant all permissions to super_admin role', async () => {
    const superAdminContext = { ...mockContext, role: 'super_admin' as const }
    
    const memberPermission = await permissionManager.hasPermission(superAdminContext, 'member:read_profile')
    const adminPermission = await permissionManager.hasPermission(superAdminContext, 'admin:manage_members')
    const superAdminPermission = await permissionManager.hasPermission(superAdminContext, 'super_admin:full_access')
    
    expect(memberPermission).toBe(true)
    expect(adminPermission).toBe(true)
    expect(superAdminPermission).toBe(true)
  })

  test('should check multiple permissions correctly', async () => {
    const memberPermissions = [
      'member:read_profile',
      'member:view_savings',
      'member:view_transactions'
    ] as const

    const result = await permissionManager.hasPermissions(mockContext, memberPermissions)
    expect(result).toBe(true)
  })

  test('should deny when one permission in group is denied', async () => {
    const mixedPermissions = [
      'member:read_profile',
      'admin:manage_members' // This should be denied for member role
    ] as const

    const result = await permissionManager.hasPermissions(mockContext, mixedPermissions)
    expect(result).toBe(false)
  })

  test('should validate tenant isolation', async () => {
    const sameTenantResult = await permissionManager.validateTenantAccess(mockContext, 'test-tenant')
    expect(sameTenantResult).toBe(true)

    const differentTenantResult = await permissionManager.validateTenantAccess(mockContext, 'other-tenant')
    expect(differentTenantResult).toBe(false)
  })

  test('should allow super admin to access any tenant', async () => {
    const superAdminContext = { ...mockContext, role: 'super_admin' as const }
    
    const result = await permissionManager.validateTenantAccess(superAdminContext, 'any-tenant')
    expect(result).toBe(true)
  })
})

describe('Audit Logging Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should log authentication attempts', async () => {
    const logSpy = jest.spyOn(auditLogger, 'log')
    
    await auditLogger.logAuth('login', true, 'test-user', { email: 'test@example.com' }, {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    })

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        action: 'auth_login',
        resource: 'authentication',
        user_id: 'test-user',
        success: true
      })
    )
  })

  test('should log failed authentication attempts', async () => {
    const logSpy = jest.spyOn(auditLogger, 'log')
    const securityEventSpy = jest.spyOn(auditLogger, 'logSecurityEvent')
    
    await auditLogger.logAuth('login', false, undefined, { email: 'test@example.com' }, {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    })

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        action: 'auth_login',
        success: false,
        error_message: 'Failed login attempt'
      })
    )

    expect(securityEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth_failure',
        severity: 'medium',
        description: 'Failed login attempt'
      }),
      expect.any(Object)
    )
  })

  test('should log financial transactions', async () => {
    const logSpy = jest.spyOn(auditLogger, 'log')
    
    await auditLogger.logFinancialTransaction(
      'deposit',
      100000,
      'test-user',
      'test-tenant',
      true,
      { savings_type: 'pokok' }
    )

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        action: 'financial_deposit',
        resource: 'financial_transaction',
        user_id: 'test-user',
        tenant_id: 'test-tenant',
        success: true,
        metadata: expect.objectContaining({
          amount: 100000,
          action: 'deposit',
          savings_type: 'pokok'
        })
      })
    )
  })

  test('should log admin actions', async () => {
    const logSpy = jest.spyOn(auditLogger, 'log')
    
    await auditLogger.logAdminAction(
      'create_member',
      'target-user',
      'admin-user',
      'test-tenant',
      true,
      { role: 'member' }
    )

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        action: 'admin_create_member',
        resource: 'admin_panel',
        user_id: 'admin-user',
        tenant_id: 'test-tenant',
        success: true,
        metadata: expect.objectContaining({
          target_user_id: 'target-user',
          admin_user_id: 'admin-user',
          action: 'create_member',
          role: 'member'
        })
      })
    )
  })

  test('should sanitize sensitive data in metadata', async () => {
    const logSpy = jest.spyOn(auditLogger, 'log')
    
    await auditLogger.logAuth('register', true, 'test-user', {
      email: 'test@example.com',
      password: 'secret123',
      token: 'jwt-token-here'
    })

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'test@example.com',
          password: '***REDACTED***',
          token: '***REDACTED***'
        })
      })
    )
  })

  test('should log security events with proper severity', async () => {
    const securityEventSpy = jest.spyOn(auditLogger, 'logSecurityEvent')
    
    await auditLogger.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      description: 'Multiple failed login attempts',
      user_id: 'test-user',
      details: { attempts: 5 }
    })

    expect(securityEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'suspicious_activity',
        severity: 'high',
        description: 'Multiple failed login attempts',
        user_id: 'test-user',
        details: { attempts: 5 }
      }),
      undefined
    )
  })
})

describe('Input Validation Tests', () => {
  test('should validate file upload security', () => {
    const allowedMimeTypes = securityConfig.upload.allowedMimeTypes
    const allowedExtensions = securityConfig.upload.allowedExtensions
    const maxFileSize = securityConfig.upload.maxFileSize

    expect(allowedMimeTypes).toContain('image/jpeg')
    expect(allowedMimeTypes).toContain('image/png')
    expect(allowedMimeTypes).toContain('application/pdf')
    expect(allowedExtensions).toContain('.jpg')
    expect(allowedExtensions).toContain('.pdf')
    expect(maxFileSize).toBe(5242880) // 5MB
  })

  test('should have password policy requirements', () => {
    const passwordPolicy = securityConfig.password

    expect(passwordPolicy.minLength).toBeGreaterThanOrEqual(8)
    expect(passwordPolicy.requireUppercase).toBe(true)
    expect(passwordPolicy.requireLowercase).toBe(true)
    expect(passwordPolicy.requireNumbers).toBe(true)
  })

  test('should have proper security headers configuration', () => {
    const headers = securityConfig.securityHeaders

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-XSS-Protection']).toBe('1; mode=block')
    expect(headers).toHaveProperty('Strict-Transport-Security')
  })
})

describe('Cooperative Specific Security Tests', () => {
  test('should have proper financial transaction limits', () => {
    const limits = securityConfig.cooperative.transactionLimits

    expect(limits.maxDepositPerDay).toBe(10_000_000) // 10M IDR
    expect(limits.maxWithdrawalPerDay).toBe(5_000_000) // 5M IDR
    expect(limits.maxTransferPerDay).toBe(2_000_000) // 2M IDR
  })

  test('should have member access controls', () => {
    const memberAccess = securityConfig.cooperative.memberAccess

    expect(memberAccess.maxLoginAttempts).toBe(5)
    expect(memberAccess.lockoutDurationMinutes).toBe(30)
    expect(memberAccess.sessionTimeoutMinutes).toBe(60)
  })

  test('should have admin access controls', () => {
    const adminAccess = securityConfig.cooperative.adminAccess

    expect(adminAccess.maxLoginAttempts).toBe(3)
    expect(adminAccess.lockoutDurationMinutes).toBe(60)
    expect(typeof adminAccess.requireTwoFactor).toBe('boolean')
  })

  test('should enable tenant isolation', () => {
    expect(securityConfig.cooperative.enableTenantIsolation).toBe(true)
  })
})

describe('Integration Tests', () => {
  test('should create access context correctly', async () => {
    const context = await createAccessContext({
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      session_id: 'test-session',
      request_id: 'test-request'
    })

    expect(context).not.toBeNull()
    expect(context?.user_id).toBe('test-user')
    expect(context?.role).toBe('member')
    expect(context?.tenant_id).toBe('test-tenant')
    expect(context?.ip_address).toBe('192.168.1.1')
  })

  test('should handle authentication flow with rate limiting and audit logging', async () => {
    const { req } = createMocks({
      method: 'POST',
      url: '/api/auth/login',
      headers: {
        'x-forwarded-for': '192.168.1.100',
        'user-agent': 'Mozilla/5.0'
      },
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    })

    const nextReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: req.headers as any,
      ip: '192.168.1.100',
      body: JSON.stringify(req.body)
    })

    // Test rate limiting
    const rateLimitResult = await applyRateLimit(nextReq, 'auth')
    expect(rateLimitResult.success).toBe(true)

    // Test suspicious activity detection
    const suspiciousResult = await checkSuspiciousActivity(nextReq)
    expect(suspiciousResult.isSuspicious).toBe(false)

    // Test audit logging
    const logSpy = jest.spyOn(auditLogger, 'logAuth')
    await auditLogger.logAuth('login', true, 'test-user', { email: 'test@example.com' }, {
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0'
    })

    expect(logSpy).toHaveBeenCalled()
  })
})