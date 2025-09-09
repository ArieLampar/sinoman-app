// config/security.ts
// Konfigurasi keamanan untuk Sinoman SuperApp

export const securityConfig = {
  // Rate Limiting Configuration
  rateLimit: {
    // General API rate limit
    general: {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    },
    // Authentication endpoints (lebih ketat)
    auth: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    // Admin endpoints (paling ketat)
    admin: {
      maxRequests: 30,
      windowMs: 60 * 1000, // 1 minute
    },
    // File upload endpoints
    upload: {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_BASE_URL!]
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.NEXT_PUBLIC_SUPABASE_URL!],
      fontSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },

  // Session Configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },

  // File Upload Security
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.xlsx'],
  },

  // Password Policy
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false, // Opsional untuk koperasi
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '24h',
    algorithm: 'HS256' as const,
  },

  // Audit Log Configuration
  audit: {
    enabled: process.env.ENABLE_AUDIT_LOG === 'true',
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'session',
    ],
    retentionDays: 90, // Simpan log audit selama 90 hari
  },

  // IP Whitelist (untuk admin access)
  ipWhitelist: process.env.NODE_ENV === 'production' 
    ? process.env.ADMIN_IP_WHITELIST?.split(',') || []
    : [], // No restriction in development

  // Security Headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  },

  // CSRF Protection
  csrf: {
    secret: process.env.CSRF_SECRET!,
    cookieName: '__Host-csrf-token',
    headerName: 'X-CSRF-Token',
  },

  // API Keys & Secrets Validation
  requiredEnvVars: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'SESSION_SECRET',
    'CSRF_SECRET',
  ],

  // Cooperative Specific Security
  cooperative: {
    // Multi-tenancy isolation
    enableTenantIsolation: true,
    
    // Financial transaction limits (dalam rupiah)
    transactionLimits: {
      maxDepositPerDay: 10_000_000, // 10 juta rupiah
      maxWithdrawalPerDay: 5_000_000, // 5 juta rupiah
      maxTransferPerDay: 2_000_000, // 2 juta rupiah
    },

    // Member access controls
    memberAccess: {
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
      sessionTimeoutMinutes: 60,
    },

    // Admin access controls
    adminAccess: {
      requireTwoFactor: process.env.NODE_ENV === 'production',
      maxLoginAttempts: 3,
      lockoutDurationMinutes: 60,
    },
  }
}

// Validation function untuk environment variables
export function validateSecurityConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  securityConfig.requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  })

  // Validate JWT secret length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long')
  }

  // Validate session secret length
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long')
  }

  // Validate CSRF secret length
  if (process.env.CSRF_SECRET && process.env.CSRF_SECRET.length < 32) {
    errors.push('CSRF_SECRET must be at least 32 characters long')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export default securityConfig