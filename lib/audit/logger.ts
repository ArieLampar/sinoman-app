// lib/audit/logger.ts
// Sistem audit logging untuk Sinoman SuperApp

import { supabaseAdmin } from '@/lib/supabase/admin'
import { securityConfig } from '@/config/security'

export type AuditLogLevel = 'info' | 'warn' | 'error' | 'critical'

export interface AuditLogEntry {
  level: AuditLogLevel
  action: string
  resource: string
  user_id?: string
  tenant_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
  timestamp: string
  session_id?: string
  request_id?: string
  success: boolean
  error_message?: string
}

export interface SecurityEvent {
  type: 'auth_attempt' | 'auth_success' | 'auth_failure' | 'permission_denied' | 
        'data_access' | 'data_modification' | 'admin_action' | 'financial_transaction' |
        'suspicious_activity' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  user_id?: string
  tenant_id?: string
  ip_address?: string
  details?: Record<string, unknown>
}

class AuditLogger {
  private isEnabled: boolean
  private logLevel: string

  constructor() {
    this.isEnabled = securityConfig.audit.enabled
    this.logLevel = process.env.LOG_LEVEL || 'info'
  }

  /**
   * Log audit event ke database dan console
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    if (!this.isEnabled) return

    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      metadata: this.sanitizeMetadata(entry.metadata || {})
    }

    // Log ke console untuk development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${logEntry.level.toUpperCase()}: ${logEntry.action}`, {
        resource: logEntry.resource,
        user_id: logEntry.user_id,
        success: logEntry.success,
        metadata: logEntry.metadata
      })
    }

    // Simpan ke database
    try {
      await supabaseAdmin.from('audit_logs').insert({
        level: logEntry.level,
        action: logEntry.action,
        resource: logEntry.resource,
        user_id: logEntry.user_id,
        tenant_id: logEntry.tenant_id,
        ip_address: logEntry.ip_address,
        user_agent: logEntry.user_agent,
        metadata: logEntry.metadata,
        session_id: logEntry.session_id,
        request_id: logEntry.request_id,
        success: logEntry.success,
        error_message: logEntry.error_message,
        created_at: logEntry.timestamp
      })
    } catch (error) {
      // Jika gagal simpan ke database, log ke console sebagai fallback
      console.error('[AUDIT] Failed to save audit log:', error)
      console.log('[AUDIT] Fallback log:', logEntry)
    }
  }

  /**
   * Log security event khusus
   */
  async logSecurityEvent(event: SecurityEvent, request?: {
    ip?: string
    userAgent?: string
    userId?: string
    tenantId?: string
    sessionId?: string
    requestId?: string
  }): Promise<void> {
    const level: AuditLogLevel = event.severity === 'critical' || event.severity === 'high' 
      ? 'error' 
      : event.severity === 'medium' ? 'warn' : 'info'

    await this.log({
      level,
      action: `security_event_${event.type}`,
      resource: 'security',
      user_id: event.user_id || request?.userId,
      tenant_id: event.tenant_id || request?.tenantId,
      ip_address: event.ip_address || request?.ip,
      user_agent: request?.userAgent,
      session_id: request?.sessionId,
      request_id: request?.requestId,
      success: event.severity === 'low' || event.severity === 'medium',
      error_message: event.severity === 'high' || event.severity === 'critical' ? event.description : undefined,
      metadata: {
        event_type: event.type,
        severity: event.severity,
        description: event.description,
        ...event.details
      }
    })

    // Untuk event critical, kirim alert
    if (event.severity === 'critical') {
      await this.sendSecurityAlert(event, request)
    }
  }

  /**
   * Log authentication attempts
   */
  async logAuth(type: 'login' | 'logout' | 'register' | 'password_reset', success: boolean, user_id?: string, details?: Record<string, unknown>, request?: {
    ip?: string
    userAgent?: string
    sessionId?: string
    requestId?: string
  }): Promise<void> {
    await this.log({
      level: success ? 'info' : 'warn',
      action: `auth_${type}`,
      resource: 'authentication',
      user_id,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      session_id: request?.sessionId,
      request_id: request?.requestId,
      success,
      error_message: success ? undefined : `Failed ${type} attempt`,
      metadata: details
    })

    // Log security event untuk failed attempts
    if (!success) {
      await this.logSecurityEvent({
        type: 'auth_failure',
        severity: 'medium',
        description: `Failed ${type} attempt`,
        user_id,
        details
      }, request)
    }
  }

  /**
   * Log financial transactions
   */
  async logFinancialTransaction(action: string, amount: number, user_id: string, tenant_id: string, success: boolean, details?: Record<string, unknown>, request?: {
    ip?: string
    userAgent?: string
    sessionId?: string
    requestId?: string
  }): Promise<void> {
    await this.log({
      level: success ? 'info' : 'error',
      action: `financial_${action}`,
      resource: 'financial_transaction',
      user_id,
      tenant_id,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      session_id: request?.sessionId,
      request_id: request?.requestId,
      success,
      error_message: success ? undefined : `Failed financial transaction: ${action}`,
      metadata: {
        amount,
        action,
        ...details
      }
    })
  }

  /**
   * Log admin actions
   */
  async logAdminAction(action: string, target_user_id: string, admin_user_id: string, tenant_id: string, success: boolean, details?: Record<string, unknown>, request?: {
    ip?: string
    userAgent?: string
    sessionId?: string
    requestId?: string
  }): Promise<void> {
    await this.log({
      level: success ? 'info' : 'error',
      action: `admin_${action}`,
      resource: 'admin_panel',
      user_id: admin_user_id,
      tenant_id,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      session_id: request?.sessionId,
      request_id: request?.requestId,
      success,
      error_message: success ? undefined : `Failed admin action: ${action}`,
      metadata: {
        target_user_id,
        admin_user_id,
        action,
        ...details
      }
    })
  }

  /**
   * Log data access
   */
  async logDataAccess(resource: string, action: 'read' | 'create' | 'update' | 'delete', user_id: string, tenant_id: string, success: boolean, details?: Record<string, unknown>, request?: {
    ip?: string
    userAgent?: string
    sessionId?: string
    requestId?: string
  }): Promise<void> {
    await this.log({
      level: success ? 'info' : 'warn',
      action: `data_${action}`,
      resource,
      user_id,
      tenant_id,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      session_id: request?.sessionId,
      request_id: request?.requestId,
      success,
      error_message: success ? undefined : `Failed data access: ${action} on ${resource}`,
      metadata: {
        action,
        resource,
        ...details
      }
    })
  }

  /**
   * Sanitize metadata untuk menghapus informasi sensitif
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...metadata }

    securityConfig.audit.sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***'
      }
    })

    // Rekursif untuk nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeMetadata(sanitized[key] as Record<string, unknown>)
      }
    })

    return sanitized
  }

  /**
   * Kirim alert untuk security event critical
   */
  private async sendSecurityAlert(event: SecurityEvent, request?: {
    ip?: string
    userAgent?: string
    userId?: string
    tenantId?: string
    sessionId?: string
    requestId?: string
  }): Promise<void> {
    try {
      const alertData = {
        timestamp: new Date().toISOString(),
        event_type: event.type,
        severity: event.severity,
        description: event.description,
        user_id: event.user_id || request?.userId,
        tenant_id: event.tenant_id || request?.tenantId,
        ip_address: event.ip_address || request?.ip,
        user_agent: request?.userAgent,
        details: event.details
      }

      // Log ke console untuk immediate attention
      console.error('🚨 CRITICAL SECURITY ALERT 🚨', alertData)

      // Jika ada webhook monitoring, kirim ke sana
      if (process.env.MONITORING_WEBHOOK_URL) {
        try {
          await fetch(process.env.MONITORING_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              alert_type: 'security_critical',
              ...alertData
            }),
          })
        } catch (webhookError) {
          console.error('[AUDIT] Failed to send webhook alert:', webhookError)
        }
      }

      // Simpan critical alert ke database
      await supabaseAdmin.from('security_alerts').insert({
        event_type: event.type,
        severity: event.severity,
        description: event.description,
        user_id: event.user_id || request?.userId,
        tenant_id: event.tenant_id || request?.tenantId,
        ip_address: event.ip_address || request?.ip,
        user_agent: request?.userAgent,
        session_id: request?.sessionId,
        request_id: request?.requestId,
        metadata: alertData.details,
        created_at: alertData.timestamp
      })

    } catch (error) {
      console.error('[AUDIT] Failed to send security alert:', error)
    }
  }

  /**
   * Cleanup old audit logs berdasarkan retention policy
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - securityConfig.audit.retentionDays)

      await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      console.log(`[AUDIT] Cleaned up audit logs older than ${securityConfig.audit.retentionDays} days`)
    } catch (error) {
      console.error('[AUDIT] Failed to cleanup old logs:', error)
    }
  }
}

// Singleton instance
const auditLogger = new AuditLogger()
export default auditLogger

// Helper functions untuk kemudahan penggunaan
export const logAuth = auditLogger.logAuth.bind(auditLogger)
export const logFinancialTransaction = auditLogger.logFinancialTransaction.bind(auditLogger)
export const logAdminAction = auditLogger.logAdminAction.bind(auditLogger)
export const logDataAccess = auditLogger.logDataAccess.bind(auditLogger)
export const logSecurityEvent = auditLogger.logSecurityEvent.bind(auditLogger)