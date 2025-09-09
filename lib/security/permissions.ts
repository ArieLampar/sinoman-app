// lib/security/permissions.ts
// Sistema kontrol akses dan permission untuk Sinoman SuperApp

import { getServerSession } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import auditLogger from '@/lib/audit/logger'

export type UserRole = 'member' | 'pengurus' | 'admin' | 'super_admin'

export type Permission = 
  // Member permissions
  | 'member:read_profile'
  | 'member:update_profile'
  | 'member:view_savings'
  | 'member:view_transactions'
  | 'member:make_transaction'
  | 'member:view_waste_balance'
  | 'member:submit_waste'
  | 'member:view_products'
  | 'member:place_order'
  | 'member:view_notifications'
  
  // Pengurus permissions (inherit member + additional)
  | 'pengurus:view_member_list'
  | 'pengurus:process_transactions'
  | 'pengurus:verify_waste_submissions'
  | 'pengurus:create_products'
  | 'pengurus:manage_orders'
  | 'pengurus:send_notifications'
  
  // Admin permissions (inherit pengurus + additional)
  | 'admin:manage_members'
  | 'admin:view_all_transactions'
  | 'admin:generate_reports'
  | 'admin:manage_system_settings'
  | 'admin:view_audit_logs'
  | 'admin:manage_tenants'
  
  // Super admin permissions (inherit admin + additional)
  | 'super_admin:full_access'
  | 'super_admin:system_configuration'
  | 'super_admin:security_management'

export interface AccessContext {
  user_id: string
  tenant_id: string
  role: UserRole
  ip_address?: string
  user_agent?: string
  session_id?: string
  request_id?: string
}

// Definisi permission hierarchy
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  member: [
    'member:read_profile',
    'member:update_profile',
    'member:view_savings',
    'member:view_transactions',
    'member:make_transaction',
    'member:view_waste_balance',
    'member:submit_waste',
    'member:view_products',
    'member:place_order',
    'member:view_notifications'
  ],
  
  pengurus: [
    // Inherit member permissions
    'member:read_profile',
    'member:update_profile',
    'member:view_savings',
    'member:view_transactions',
    'member:make_transaction',
    'member:view_waste_balance',
    'member:submit_waste',
    'member:view_products',
    'member:place_order',
    'member:view_notifications',
    
    // Additional pengurus permissions
    'pengurus:view_member_list',
    'pengurus:process_transactions',
    'pengurus:verify_waste_submissions',
    'pengurus:create_products',
    'pengurus:manage_orders',
    'pengurus:send_notifications'
  ],
  
  admin: [
    // Inherit all pengurus permissions
    'member:read_profile',
    'member:update_profile',
    'member:view_savings',
    'member:view_transactions',
    'member:make_transaction',
    'member:view_waste_balance',
    'member:submit_waste',
    'member:view_products',
    'member:place_order',
    'member:view_notifications',
    'pengurus:view_member_list',
    'pengurus:process_transactions',
    'pengurus:verify_waste_submissions',
    'pengurus:create_products',
    'pengurus:manage_orders',
    'pengurus:send_notifications',
    
    // Additional admin permissions
    'admin:manage_members',
    'admin:view_all_transactions',
    'admin:generate_reports',
    'admin:manage_system_settings',
    'admin:view_audit_logs',
    'admin:manage_tenants'
  ],
  
  super_admin: [
    // All permissions
    'member:read_profile',
    'member:update_profile',
    'member:view_savings',
    'member:view_transactions',
    'member:make_transaction',
    'member:view_waste_balance',
    'member:submit_waste',
    'member:view_products',
    'member:place_order',
    'member:view_notifications',
    'pengurus:view_member_list',
    'pengurus:process_transactions',
    'pengurus:verify_waste_submissions',
    'pengurus:create_products',
    'pengurus:manage_orders',
    'pengurus:send_notifications',
    'admin:manage_members',
    'admin:view_all_transactions',
    'admin:generate_reports',
    'admin:manage_system_settings',
    'admin:view_audit_logs',
    'admin:manage_tenants',
    'super_admin:full_access',
    'super_admin:system_configuration',
    'super_admin:security_management'
  ]
}

class PermissionManager {
  
  /**
   * Check apakah user memiliki permission tertentu
   */
  async hasPermission(context: AccessContext, permission: Permission): Promise<boolean> {
    try {
      // Super admin selalu memiliki semua permissions
      if (context.role === 'super_admin') {
        return true
      }
      
      // Check permission berdasarkan role
      const rolePermissions = ROLE_PERMISSIONS[context.role]
      const hasRolePermission = rolePermissions.includes(permission)
      
      if (!hasRolePermission) {
        // Log permission denied
        await auditLogger.logSecurityEvent({
          type: 'permission_denied',
          severity: 'low',
          description: `Permission denied: ${permission}`,
          user_id: context.user_id,
          tenant_id: context.tenant_id,
          details: {
            permission,
            userRole: context.role,
            requiredPermission: permission
          }
        }, {
          ip: context.ip_address,
          userAgent: context.user_agent,
          sessionId: context.session_id,
          requestId: context.request_id
        })
      }
      
      return hasRolePermission
    } catch (error) {
      console.error('[PERMISSIONS] Error checking permission:', error)
      
      // Log error
      await auditLogger.logSecurityEvent({
        type: 'system_error',
        severity: 'medium',
        description: 'Error checking permission',
        user_id: context.user_id,
        tenant_id: context.tenant_id,
        details: {
          permission,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, {
        ip: context.ip_address,
        userAgent: context.user_agent,
        sessionId: context.session_id,
        requestId: context.request_id
      })
      
      // Default to deny access on error
      return false
    }
  }

  /**
   * Check multiple permissions sekaligus
   */
  async hasPermissions(context: AccessContext, permissions: Permission[]): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(permission => this.hasPermission(context, permission))
    )
    
    return results.every(result => result === true)
  }

  /**
   * Check permission untuk resource tertentu dengan additional validation
   */
  async hasResourceAccess(
    context: AccessContext, 
    permission: Permission, 
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    // Basic permission check
    const hasBasicPermission = await this.hasPermission(context, permission)
    if (!hasBasicPermission) return false
    
    // Additional resource-specific checks
    try {
      switch (resourceType) {
        case 'member':
          return await this.checkMemberAccess(context, resourceId)
        
        case 'transaction':
          return await this.checkTransactionAccess(context, resourceId)
        
        case 'savings_account':
          return await this.checkSavingsAccess(context, resourceId)
        
        case 'waste_balance':
          return await this.checkWasteAccess(context, resourceId)
        
        case 'order':
          return await this.checkOrderAccess(context, resourceId)
        
        default:
          // For unknown resource types, rely on basic permission
          return hasBasicPermission
      }
    } catch (error) {
      console.error('[PERMISSIONS] Error checking resource access:', error)
      return false
    }
  }

  /**
   * Validate tenant isolation - user hanya bisa akses data dari tenant mereka
   */
  async validateTenantAccess(context: AccessContext, targetTenantId: string): Promise<boolean> {
    // Super admin bisa akses semua tenant
    if (context.role === 'super_admin') return true
    
    // User lain hanya bisa akses tenant mereka sendiri
    return context.tenant_id === targetTenantId
  }

  /**
   * Check member access - user hanya bisa akses data mereka sendiri kecuali admin/pengurus
   */
  private async checkMemberAccess(context: AccessContext, memberId: string): Promise<boolean> {
    // Admin dan pengurus bisa akses semua member dalam tenant mereka
    if (['admin', 'pengurus', 'super_admin'].includes(context.role)) {
      return true
    }
    
    // Member hanya bisa akses data mereka sendiri
    return context.user_id === memberId
  }

  /**
   * Check transaction access
   */
  private async checkTransactionAccess(context: AccessContext, transactionId: string): Promise<boolean> {
    try {
      const { data: transaction } = await supabaseAdmin
        .from('transactions')
        .select('member_id, tenant_id')
        .eq('id', transactionId)
        .single()

      if (!transaction) return false

      // Check tenant isolation
      if (!await this.validateTenantAccess(context, transaction.tenant_id)) {
        return false
      }

      // Admin dan pengurus bisa akses semua transaksi dalam tenant mereka
      if (['admin', 'pengurus', 'super_admin'].includes(context.role)) {
        return true
      }

      // Member hanya bisa akses transaksi mereka sendiri
      return context.user_id === transaction.member_id
    } catch (error) {
      console.error('[PERMISSIONS] Error checking transaction access:', error)
      return false
    }
  }

  /**
   * Check savings account access
   */
  private async checkSavingsAccess(context: AccessContext, accountId: string): Promise<boolean> {
    try {
      const { data: account } = await supabaseAdmin
        .from('savings_accounts')
        .select('member_id, tenant_id')
        .eq('id', accountId)
        .single()

      if (!account) return false

      // Check tenant isolation
      if (!await this.validateTenantAccess(context, account.tenant_id)) {
        return false
      }

      // Admin dan pengurus bisa akses semua akun dalam tenant mereka
      if (['admin', 'pengurus', 'super_admin'].includes(context.role)) {
        return true
      }

      // Member hanya bisa akses akun mereka sendiri
      return context.user_id === account.member_id
    } catch (error) {
      console.error('[PERMISSIONS] Error checking savings access:', error)
      return false
    }
  }

  /**
   * Check waste balance access
   */
  private async checkWasteAccess(context: AccessContext, wasteBalanceId: string): Promise<boolean> {
    try {
      const { data: wasteBalance } = await supabaseAdmin
        .from('waste_balances')
        .select('member_id, tenant_id')
        .eq('id', wasteBalanceId)
        .single()

      if (!wasteBalance) return false

      // Check tenant isolation
      if (!await this.validateTenantAccess(context, wasteBalance.tenant_id)) {
        return false
      }

      // Admin dan pengurus bisa akses semua waste balance dalam tenant mereka
      if (['admin', 'pengurus', 'super_admin'].includes(context.role)) {
        return true
      }

      // Member hanya bisa akses waste balance mereka sendiri
      return context.user_id === wasteBalance.member_id
    } catch (error) {
      console.error('[PERMISSIONS] Error checking waste access:', error)
      return false
    }
  }

  /**
   * Check order access
   */
  private async checkOrderAccess(context: AccessContext, orderId: string): Promise<boolean> {
    try {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('member_id, tenant_id')
        .eq('id', orderId)
        .single()

      if (!order) return false

      // Check tenant isolation
      if (!await this.validateTenantAccess(context, order.tenant_id)) {
        return false
      }

      // Admin dan pengurus bisa akses semua order dalam tenant mereka
      if (['admin', 'pengurus', 'super_admin'].includes(context.role)) {
        return true
      }

      // Member hanya bisa akses order mereka sendiri
      return context.user_id === order.member_id
    } catch (error) {
      console.error('[PERMISSIONS] Error checking order access:', error)
      return false
    }
  }
}

// Singleton instance
const permissionManager = new PermissionManager()

/**
 * Helper function untuk create access context dari session
 */
export async function createAccessContext(additionalContext?: {
  ip_address?: string
  user_agent?: string
  session_id?: string
  request_id?: string
}): Promise<AccessContext | null> {
  try {
    const session = await getServerSession()
    if (!session) return null

    // Get member data to get role and tenant_id
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('role, tenant_id')
      .eq('id', session.user.id)
      .single()

    if (!member) return null

    return {
      user_id: session.user.id,
      tenant_id: member.tenant_id,
      role: member.role as UserRole,
      ...additionalContext
    }
  } catch (error) {
    console.error('[PERMISSIONS] Error creating access context:', error)
    return null
  }
}

/**
 * Higher-order function untuk protect API routes dengan permission check
 */
export function withPermission(
  handler: (req: Request, context: AccessContext) => Promise<Response>,
  requiredPermission: Permission
) {
  return async (req: Request): Promise<Response> => {
    try {
      const context = await createAccessContext({
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

      if (!context) {
        return new Response(
          JSON.stringify({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      const hasPermission = await permissionManager.hasPermission(context, requiredPermission)
      if (!hasPermission) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient permissions',
            code: 'PERMISSION_DENIED',
            required_permission: requiredPermission
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      return await handler(req, context)
    } catch (error) {
      console.error('[PERMISSIONS] Error in permission wrapper:', error)
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export { permissionManager }
export default permissionManager