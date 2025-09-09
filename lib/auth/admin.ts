// lib/auth/admin.ts
// Admin authentication and authorization utilities

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AdminUser } from '@/types/database.types'

/**
 * Get admin user from server-side context
 */
export async function getServerAdminUser(): Promise<AdminUser | null> {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Check if user is an admin
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (error || !adminUser) return null

    return adminUser
  } catch (error) {
    console.error('Error getting admin user:', error)
    return null
  }
}

/**
 * Check if user has specific admin role
 */
export async function hasAdminRole(roles: string | string[]): Promise<boolean> {
  const adminUser = await getServerAdminUser()
  
  if (!adminUser) return false

  const requiredRoles = Array.isArray(roles) ? roles : [roles]
  return requiredRoles.includes(adminUser.role)
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const adminUser = await getServerAdminUser()
  
  if (!adminUser || !adminUser.permissions) return false

  return adminUser.permissions[permission] === true
}

/**
 * Admin role hierarchy and permissions
 */
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  PENGURUS: 'pengurus',
  OPERATOR: 'operator'
} as const

export const ADMIN_PERMISSIONS = {
  // Member management
  MANAGE_MEMBERS: 'manage_members',
  VIEW_MEMBERS: 'view_members',
  EDIT_MEMBERS: 'edit_members',
  DELETE_MEMBERS: 'delete_members',
  
  // Financial management
  MANAGE_TRANSACTIONS: 'manage_transactions',
  VIEW_TRANSACTIONS: 'view_transactions',
  APPROVE_TRANSACTIONS: 'approve_transactions',
  
  // Reports and analytics
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  
  // System management
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_USERS: 'manage_users',
  
  // Waste bank management
  MANAGE_WASTE: 'manage_waste',
  VIEW_WASTE: 'view_waste',
  
  // E-commerce management
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_ORDERS: 'manage_orders',
  
  // Fit challenge management
  MANAGE_CHALLENGES: 'manage_challenges',
} as const

/**
 * Default permissions for each role
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(ADMIN_PERMISSIONS),
  [ADMIN_ROLES.ADMIN]: [
    ADMIN_PERMISSIONS.MANAGE_MEMBERS,
    ADMIN_PERMISSIONS.VIEW_MEMBERS,
    ADMIN_PERMISSIONS.EDIT_MEMBERS,
    ADMIN_PERMISSIONS.MANAGE_TRANSACTIONS,
    ADMIN_PERMISSIONS.VIEW_TRANSACTIONS,
    ADMIN_PERMISSIONS.APPROVE_TRANSACTIONS,
    ADMIN_PERMISSIONS.VIEW_REPORTS,
    ADMIN_PERMISSIONS.EXPORT_DATA,
    ADMIN_PERMISSIONS.MANAGE_WASTE,
    ADMIN_PERMISSIONS.VIEW_WASTE,
    ADMIN_PERMISSIONS.MANAGE_PRODUCTS,
    ADMIN_PERMISSIONS.MANAGE_ORDERS,
  ],
  [ADMIN_ROLES.PENGURUS]: [
    ADMIN_PERMISSIONS.VIEW_MEMBERS,
    ADMIN_PERMISSIONS.EDIT_MEMBERS,
    ADMIN_PERMISSIONS.VIEW_TRANSACTIONS,
    ADMIN_PERMISSIONS.APPROVE_TRANSACTIONS,
    ADMIN_PERMISSIONS.VIEW_REPORTS,
    ADMIN_PERMISSIONS.VIEW_WASTE,
    ADMIN_PERMISSIONS.MANAGE_CHALLENGES,
  ],
  [ADMIN_ROLES.OPERATOR]: [
    ADMIN_PERMISSIONS.VIEW_MEMBERS,
    ADMIN_PERMISSIONS.VIEW_TRANSACTIONS,
    ADMIN_PERMISSIONS.VIEW_WASTE,
    ADMIN_PERMISSIONS.MANAGE_PRODUCTS,
    ADMIN_PERMISSIONS.MANAGE_ORDERS,
  ]
}

/**
 * Client-side hook for admin authentication
 */
export function useAdminAuth() {
  // This would be implemented as a React hook for client-side components
  // For now, we'll focus on server-side authentication
}