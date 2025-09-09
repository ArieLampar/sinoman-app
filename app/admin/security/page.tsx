// app/admin/security/page.tsx
// Dashboard monitoring keamanan untuk admin

import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/supabase/server'
import { withPermission } from '@/lib/security/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Lock,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Search
} from 'lucide-react'

interface SecurityMetrics {
  totalAuditLogs: number
  securityAlerts: number
  rateLimitViolations: number
  suspiciousActivities: number
  authFailures: number
  adminActions: number
  activeUsers: number
  blockedIPs: number
}

interface AuditLogEntry {
  id: string
  level: string
  action: string
  resource: string
  user_id?: string
  ip_address?: string
  success: boolean
  error_message?: string
  created_at: string
  metadata?: any
}

interface SecurityAlert {
  id: string
  event_type: string
  severity: string
  description: string
  user_id?: string
  ip_address?: string
  created_at: string
  metadata?: any
}

async function getSecurityMetrics(): Promise<SecurityMetrics> {
  const supabase = await createServerClient()
  
  // Get current date range (last 24 hours)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  try {
    const [
      auditLogsResult,
      securityAlertsResult,
      rateLimitResult,
      suspiciousResult,
      authFailuresResult,
      adminActionsResult,
      activeUsersResult
    ] = await Promise.all([
      // Total audit logs in last 24h
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .gte('created_at', yesterday.toISOString()),
      
      // Security alerts in last 24h
      supabase
        .from('security_alerts')
        .select('id', { count: 'exact' })
        .gte('created_at', yesterday.toISOString()),
      
      // Rate limit violations
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('action', 'security_event_suspicious_activity')
        .gte('created_at', yesterday.toISOString()),
      
      // Suspicious activities
      supabase
        .from('security_alerts')
        .select('id', { count: 'exact' })
        .eq('event_type', 'suspicious_activity')
        .gte('created_at', yesterday.toISOString()),
      
      // Auth failures
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .ilike('action', 'auth_%')
        .eq('success', false)
        .gte('created_at', yesterday.toISOString()),
      
      // Admin actions
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .ilike('action', 'admin_%')
        .gte('created_at', yesterday.toISOString()),
      
      // Active users (users with activity in last 24h)
      supabase
        .from('audit_logs')
        .select('user_id')
        .not('user_id', 'is', null)
        .gte('created_at', yesterday.toISOString())
    ])

    // Count unique active users
    const uniqueActiveUsers = new Set(
      activeUsersResult.data?.map(log => log.user_id).filter(Boolean) || []
    ).size

    return {
      totalAuditLogs: auditLogsResult.count || 0,
      securityAlerts: securityAlertsResult.count || 0,
      rateLimitViolations: rateLimitResult.count || 0,
      suspiciousActivities: suspiciousResult.count || 0,
      authFailures: authFailuresResult.count || 0,
      adminActions: adminActionsResult.count || 0,
      activeUsers: uniqueActiveUsers,
      blockedIPs: 0 // TODO: Implement IP blocking feature
    }
  } catch (error) {
    console.error('Error fetching security metrics:', error)
    return {
      totalAuditLogs: 0,
      securityAlerts: 0,
      rateLimitViolations: 0,
      suspiciousActivities: 0,
      authFailures: 0,
      adminActions: 0,
      activeUsers: 0,
      blockedIPs: 0
    }
  }
}

async function getRecentAuditLogs(limit: number = 20): Promise<AuditLogEntry[]> {
  const supabase = await createServerClient()
  
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}

async function getRecentSecurityAlerts(limit: number = 10): Promise<SecurityAlert[]> {
  const supabase = await createServerClient()
  
  try {
    const { data, error } = await supabase
      .from('security_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching security alerts:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching security alerts:', error)
    return []
  }
}

function SecurityMetricsCards({ metrics }: { metrics: SecurityMetrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Log Audit Total</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAuditLogs.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">24 jam terakhir</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alert Keamanan</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.securityAlerts}</div>
          <p className="text-xs text-muted-foreground">Memerlukan perhatian</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aktivitas Mencurigakan</CardTitle>
          <Shield className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metrics.suspiciousActivities}</div>
          <p className="text-xs text-muted-foreground">Dalam 24 jam</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pengguna Aktif</CardTitle>
          <Users className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
          <p className="text-xs text-muted-foreground">Online hari ini</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gagal Login</CardTitle>
          <Lock className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.authFailures}</div>
          <p className="text-xs text-muted-foreground">Percobaan gagal</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pelanggaran Rate Limit</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{metrics.rateLimitViolations}</div>
          <p className="text-xs text-muted-foreground">Request berlebihan</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aksi Admin</CardTitle>
          <Eye className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{metrics.adminActions}</div>
          <p className="text-xs text-muted-foreground">Tindakan admin</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">IP Diblokir</CardTitle>
          <Shield className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">{metrics.blockedIPs}</div>
          <p className="text-xs text-muted-foreground">IP address diblokir</p>
        </CardContent>
      </Card>
    </div>
  )
}

function SecurityAlertsList({ alerts }: { alerts: SecurityAlert[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '⚡'
      case 'low': return 'ℹ️'
      default: return '❓'
    }
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alert Keamanan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada alert keamanan</p>
            <p className="text-sm">Sistem berjalan dengan aman</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Alert Keamanan Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <Badge variant={getSeverityColor(alert.severity) as any}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {alert.event_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString('id-ID')}
                </time>
              </div>
              
              <p className="text-sm">{alert.description}</p>
              
              {(alert.ip_address || alert.user_id) && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {alert.ip_address && <div>IP: {alert.ip_address}</div>}
                  {alert.user_id && <div>User ID: {alert.user_id}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AuditLogTable({ logs }: { logs: AuditLogEntry[] }) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600'
      case 'warn': return 'text-yellow-600'
      case 'info': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log Audit Terbaru
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Level</th>
                <th className="text-left p-2">Aksi</th>
                <th className="text-left p-2">Resource</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">IP Address</th>
                <th className="text-left p-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span>{getLevelIcon(log.level)}</span>
                      <span className={`text-xs font-medium ${getLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 font-mono text-xs">{log.action}</td>
                  <td className="p-2 text-xs">{log.resource}</td>
                  <td className="p-2">
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? 'Berhasil' : 'Gagal'}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono text-xs">{log.ip_address || '-'}</td>
                  <td className="p-2 text-xs">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada log audit</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function SecurityDashboardPage() {
  // Check if user is admin (this will be handled by middleware too)
  const session = await getServerSession()
  if (!session) {
    return <div>Unauthorized</div>
  }

  const [metrics, auditLogs, securityAlerts] = await Promise.all([
    getSecurityMetrics(),
    getRecentAuditLogs(50),
    getRecentSecurityAlerts(20)
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          Dashboard Keamanan Sistem
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor aktivitas keamanan dan audit sistem secara real-time
        </p>
      </div>

      {/* Security Status Alert */}
      {(metrics.securityAlerts > 0 || metrics.suspiciousActivities > 5) && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Perhatian!</strong> Terdeteksi {metrics.securityAlerts} alert keamanan 
            dan {metrics.suspiciousActivities} aktivitas mencurigakan dalam 24 jam terakhir. 
            Silakan periksa log untuk detail lebih lanjut.
          </AlertDescription>
        </Alert>
      )}

      <Suspense fallback={<div>Loading metrics...</div>}>
        <SecurityMetricsCards metrics={metrics} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div>Loading audit logs...</div>}>
            <AuditLogTable logs={auditLogs} />
          </Suspense>
        </div>
        
        <div>
          <Suspense fallback={<div>Loading security alerts...</div>}>
            <SecurityAlertsList alerts={securityAlerts} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}