// mcp/server.ts
// MCP Server untuk Sinoman SuperApp dengan integrated security

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'

// Import security components
import { securityConfig, validateSecurityConfig } from '../config/security.js'
import auditLogger from '../lib/audit/logger.js'
import { applyRateLimit } from '../lib/security/rate-limiter.js'
import { permissionManager, createAccessContext } from '../lib/security/permissions.js'
import { supabaseAdmin } from '../lib/supabase/admin.js'

class SinomanMCPServer {
  private server: Server
  private isInitialized: boolean = false

  constructor() {
    this.server = new Server(
      {
        name: 'sinoman-cooperative-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    )

    this.setupHandlers()
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_member_info',
            description: 'Mendapatkan informasi lengkap anggota koperasi',
            inputSchema: {
              type: 'object',
              properties: {
                member_id: {
                  type: 'string',
                  description: 'ID anggota koperasi'
                },
                tenant_id: {
                  type: 'string', 
                  description: 'ID koperasi (tenant)'
                }
              },
              required: ['member_id', 'tenant_id']
            }
          },
          {
            name: 'get_savings_balance',
            description: 'Mendapatkan saldo simpanan anggota',
            inputSchema: {
              type: 'object',
              properties: {
                member_id: {
                  type: 'string',
                  description: 'ID anggota koperasi'
                },
                tenant_id: {
                  type: 'string',
                  description: 'ID koperasi (tenant)'
                }
              },
              required: ['member_id', 'tenant_id']
            }
          },
          {
            name: 'create_savings_transaction',
            description: 'Membuat transaksi simpanan (deposit/withdrawal)',
            inputSchema: {
              type: 'object',
              properties: {
                member_id: {
                  type: 'string',
                  description: 'ID anggota'
                },
                tenant_id: {
                  type: 'string',
                  description: 'ID koperasi'
                },
                transaction_type: {
                  type: 'string',
                  enum: ['deposit', 'withdrawal'],
                  description: 'Jenis transaksi'
                },
                savings_type: {
                  type: 'string',
                  enum: ['pokok', 'wajib', 'sukarela'],
                  description: 'Jenis simpanan'
                },
                amount: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10000000,
                  description: 'Jumlah transaksi (dalam Rupiah)'
                },
                description: {
                  type: 'string',
                  description: 'Deskripsi transaksi'
                },
                created_by: {
                  type: 'string',
                  description: 'ID user yang membuat transaksi'
                }
              },
              required: ['member_id', 'tenant_id', 'transaction_type', 'savings_type', 'amount', 'created_by']
            }
          },
          {
            name: 'get_security_metrics',
            description: 'Mendapatkan metrik keamanan sistem',
            inputSchema: {
              type: 'object',
              properties: {
                tenant_id: {
                  type: 'string',
                  description: 'ID koperasi (opsional, untuk filter)'
                },
                time_range: {
                  type: 'string',
                  enum: ['1h', '24h', '7d', '30d'],
                  default: '24h',
                  description: 'Rentang waktu data'
                }
              }
            }
          },
          {
            name: 'get_audit_logs',
            description: 'Mendapatkan log audit sistem',
            inputSchema: {
              type: 'object',
              properties: {
                tenant_id: {
                  type: 'string',
                  description: 'ID koperasi'
                },
                user_id: {
                  type: 'string',
                  description: 'ID user (opsional)'
                },
                action: {
                  type: 'string',
                  description: 'Filter berdasarkan action'
                },
                level: {
                  type: 'string',
                  enum: ['info', 'warn', 'error'],
                  description: 'Level log'
                },
                limit: {
                  type: 'number',
                  default: 50,
                  maximum: 1000,
                  description: 'Jumlah log yang diambil'
                }
              },
              required: ['tenant_id']
            }
          },
          {
            name: 'validate_security_config',
            description: 'Validasi konfigurasi keamanan sistem',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        // Validate security configuration first
        const securityValidation = validateSecurityConfig()
        if (!securityValidation.isValid) {
          throw new McpError(
            ErrorCode.InternalError,
            `Security configuration invalid: ${securityValidation.errors.join(', ')}`
          )
        }

        // Log MCP tool usage
        await auditLogger.log({
          level: 'info',
          action: `mcp_tool_${name}`,
          resource: 'mcp_server',
          success: true,
          metadata: {
            tool_name: name,
            arguments: args
          }
        })

        switch (name) {
          case 'get_member_info':
            return await this.getMemberInfo(args.member_id, args.tenant_id)

          case 'get_savings_balance':
            return await this.getSavingsBalance(args.member_id, args.tenant_id)

          case 'create_savings_transaction':
            return await this.createSavingsTransaction(args)

          case 'get_security_metrics':
            return await this.getSecurityMetrics(args.tenant_id, args.time_range || '24h')

          case 'get_audit_logs':
            return await this.getAuditLogs(args)

          case 'validate_security_config':
            return await this.validateSecurityConfig()

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`)
        }
      } catch (error) {
        // Log error
        await auditLogger.log({
          level: 'error',
          action: `mcp_tool_${name}`,
          resource: 'mcp_server',
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            tool_name: name,
            arguments: args
          }
        })

        if (error instanceof McpError) {
          throw error
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })
  }

  private async getMemberInfo(memberId: string, tenantId: string) {
    try {
      const { data: member, error } = await supabaseAdmin
        .from('members')
        .select(`
          *,
          tenant:tenants(
            tenant_name,
            tenant_code,
            tenant_type
          ),
          savings_account:savings_accounts(
            account_number,
            pokok_balance,
            wajib_balance,
            sukarela_balance,
            total_balance,
            last_transaction_date
          ),
          waste_balance:waste_balances(
            organic_balance,
            inorganic_balance,
            total_balance,
            total_weight_collected_kg,
            total_earnings,
            updated_at
          )
        `)
        .eq('id', memberId)
        .eq('tenant_id', tenantId)
        .single()

      if (error || !member) {
        return {
          content: [
            {
              type: 'text',
              text: `Member dengan ID ${memberId} tidak ditemukan di tenant ${tenantId}`
            }
          ]
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `**Informasi Anggota Koperasi**

**Data Pribadi:**
- Nama Lengkap: ${member.full_name}
- Email: ${member.email}
- Nomor Anggota: ${member.member_number || 'Belum ada'}
- Phone: ${member.phone || 'Belum diisi'}
- Alamat: ${member.address || 'Belum diisi'}
- Role: ${member.role}
- Status: ${member.status}

**Informasi Koperasi:**
- Nama Koperasi: ${member.tenant?.tenant_name || 'N/A'}
- Kode Koperasi: ${member.tenant?.tenant_code || 'N/A'}
- Jenis Koperasi: ${member.tenant?.tenant_type || 'N/A'}

**Simpanan:**
- Nomor Rekening: ${member.savings_account?.account_number || 'Belum ada'}
- Simpanan Pokok: Rp ${member.savings_account?.pokok_balance?.toLocaleString('id-ID') || '0'}
- Simpanan Wajib: Rp ${member.savings_account?.wajib_balance?.toLocaleString('id-ID') || '0'}
- Simpanan Sukarela: Rp ${member.savings_account?.sukarela_balance?.toLocaleString('id-ID') || '0'}
- **Total Simpanan: Rp ${member.savings_account?.total_balance?.toLocaleString('id-ID') || '0'}**
- Transaksi Terakhir: ${member.savings_account?.last_transaction_date ? new Date(member.savings_account.last_transaction_date).toLocaleString('id-ID') : 'Belum ada'}

**Bank Sampah:**
- Saldo Organik: ${member.waste_balance?.organic_balance || 0} poin
- Saldo Anorganik: ${member.waste_balance?.inorganic_balance || 0} poin
- Total Saldo: ${member.waste_balance?.total_balance || 0} poin
- Total Berat Dikumpulkan: ${member.waste_balance?.total_weight_collected_kg || 0} kg
- Total Pendapatan: Rp ${member.waste_balance?.total_earnings?.toLocaleString('id-ID') || '0'}

**Tanggal:**
- Bergabung: ${new Date(member.created_at).toLocaleDateString('id-ID')}
- Update Terakhir: ${new Date(member.updated_at).toLocaleDateString('id-ID')}`
          }
        ]
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error fetching member info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async getSavingsBalance(memberId: string, tenantId: string) {
    try {
      const { data: account, error } = await supabaseAdmin
        .from('savings_accounts')
        .select('*')
        .eq('member_id', memberId)
        .eq('tenant_id', tenantId)
        .single()

      if (error || !account) {
        return {
          content: [
            {
              type: 'text', 
              text: `Rekening simpanan untuk anggota ${memberId} tidak ditemukan`
            }
          ]
        }
      }

      // Get recent transactions
      const { data: recentTransactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('member_id', memberId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)

      const transactionHistory = recentTransactions?.map(tx => 
        `- ${new Date(tx.created_at).toLocaleDateString('id-ID')}: ${tx.transaction_type === 'deposit' ? '+' : '-'}Rp ${tx.amount.toLocaleString('id-ID')} (${tx.savings_type})`
      ).join('\n') || 'Belum ada transaksi'

      return {
        content: [
          {
            type: 'text',
            text: `**Saldo Simpanan**

**Rekening:** ${account.account_number}

**Saldo Saat Ini:**
- Simpanan Pokok: Rp ${account.pokok_balance.toLocaleString('id-ID')}
- Simpanan Wajib: Rp ${account.wajib_balance.toLocaleString('id-ID')}
- Simpanan Sukarela: Rp ${account.sukarela_balance.toLocaleString('id-ID')}

**Total: Rp ${account.total_balance.toLocaleString('id-ID')}**

**Transaksi Terakhir:**
${transactionHistory}

**Update Terakhir:** ${new Date(account.updated_at).toLocaleString('id-ID')}`
          }
        ]
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error fetching savings balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async createSavingsTransaction(args: any) {
    try {
      // Validate transaction limits
      const limits = securityConfig.cooperative.transactionLimits
      const maxLimit = args.transaction_type === 'deposit' 
        ? limits.maxDepositPerDay 
        : limits.maxWithdrawalPerDay

      if (args.amount > maxLimit) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Transaction amount ${args.amount} exceeds daily limit of ${maxLimit}`
        )
      }

      // Check if member exists and get current balance
      const { data: account, error: accountError } = await supabaseAdmin
        .from('savings_accounts')
        .select('*')
        .eq('member_id', args.member_id)
        .eq('tenant_id', args.tenant_id)
        .single()

      if (accountError || !account) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Savings account not found for member ${args.member_id}`
        )
      }

      // For withdrawals, check if sufficient balance
      if (args.transaction_type === 'withdrawal') {
        const currentBalance = account[`${args.savings_type}_balance`] || 0
        if (currentBalance < args.amount) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Insufficient balance. Current ${args.savings_type} balance: ${currentBalance}, requested: ${args.amount}`
          )
        }
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          member_id: args.member_id,
          tenant_id: args.tenant_id,
          transaction_type: args.transaction_type,
          savings_type: args.savings_type,
          amount: args.amount,
          description: args.description,
          created_by: args.created_by,
          transaction_date: new Date().toISOString(),
          status: 'completed'
        })
        .select()
        .single()

      if (transactionError) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create transaction: ${transactionError.message}`
        )
      }

      // Update account balance
      const multiplier = args.transaction_type === 'deposit' ? 1 : -1
      const balanceField = `${args.savings_type}_balance`
      const newBalance = account[balanceField] + (args.amount * multiplier)
      
      const newTotalBalance = 
        (args.savings_type === 'pokok' ? newBalance : account.pokok_balance) +
        (args.savings_type === 'wajib' ? newBalance : account.wajib_balance) +
        (args.savings_type === 'sukarela' ? newBalance : account.sukarela_balance)

      const { error: updateError } = await supabaseAdmin
        .from('savings_accounts')
        .update({
          [balanceField]: newBalance,
          total_balance: newTotalBalance,
          last_transaction_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('member_id', args.member_id)
        .eq('tenant_id', args.tenant_id)

      if (updateError) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to update account balance: ${updateError.message}`
        )
      }

      // Log financial transaction
      await auditLogger.logFinancialTransaction(
        args.transaction_type,
        args.amount,
        args.member_id,
        args.tenant_id,
        true,
        {
          savings_type: args.savings_type,
          description: args.description,
          transaction_id: transaction.id,
          new_balance: newBalance,
          new_total_balance: newTotalBalance
        }
      )

      return {
        content: [
          {
            type: 'text',
            text: `**Transaksi Berhasil**

**Detail Transaksi:**
- ID Transaksi: ${transaction.id}
- Jenis: ${args.transaction_type === 'deposit' ? 'Setoran' : 'Penarikan'}
- Jenis Simpanan: ${args.savings_type}
- Jumlah: Rp ${args.amount.toLocaleString('id-ID')}
- Deskripsi: ${args.description || 'Tidak ada'}

**Saldo Setelah Transaksi:**
- Saldo ${args.savings_type}: Rp ${newBalance.toLocaleString('id-ID')}
- Total Saldo: Rp ${newTotalBalance.toLocaleString('id-ID')}

**Waktu:** ${new Date().toLocaleString('id-ID')}

✅ Transaksi telah dicatat dalam sistem audit`
          }
        ]
      }
    } catch (error) {
      // Log failed transaction
      await auditLogger.logFinancialTransaction(
        args.transaction_type,
        args.amount,
        args.member_id,
        args.tenant_id,
        false,
        {
          savings_type: args.savings_type,
          description: args.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      )

      if (error instanceof McpError) {
        throw error
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Error creating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async getSecurityMetrics(tenantId?: string, timeRange: string = '24h') {
    try {
      const timeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      }

      const hours = timeMap[timeRange as keyof typeof timeMap] || 24
      const since = new Date()
      since.setHours(since.getHours() - hours)

      let auditQuery = supabaseAdmin
        .from('audit_logs')
        .select('*')
        .gte('created_at', since.toISOString())

      if (tenantId) {
        auditQuery = auditQuery.eq('tenant_id', tenantId)
      }

      const { data: auditLogs } = await auditQuery

      let alertsQuery = supabaseAdmin
        .from('security_alerts')
        .select('*')
        .gte('created_at', since.toISOString())

      if (tenantId) {
        alertsQuery = alertsQuery.eq('tenant_id', tenantId)
      }

      const { data: securityAlerts } = await alertsQuery

      // Calculate metrics
      const totalEvents = auditLogs?.length || 0
      const errorEvents = auditLogs?.filter(log => log.level === 'error').length || 0
      const warningEvents = auditLogs?.filter(log => log.level === 'warn').length || 0
      const failedEvents = auditLogs?.filter(log => !log.success).length || 0
      const authFailures = auditLogs?.filter(log => 
        log.action.startsWith('auth_') && !log.success
      ).length || 0
      
      const uniqueUsers = new Set(
        auditLogs?.map(log => log.user_id).filter(Boolean) || []
      ).size

      const uniqueIPs = new Set(
        auditLogs?.map(log => log.ip_address).filter(Boolean) || []
      ).size

      const criticalAlerts = securityAlerts?.filter(alert => 
        alert.severity === 'critical'
      ).length || 0

      const highAlerts = securityAlerts?.filter(alert => 
        alert.severity === 'high'
      ).length || 0

      return {
        content: [
          {
            type: 'text',
            text: `**Security Metrics (${timeRange})**

**Aktivitas Sistem:**
- Total Events: ${totalEvents.toLocaleString()}
- Error Events: ${errorEvents.toLocaleString()}
- Warning Events: ${warningEvents.toLocaleString()}
- Failed Operations: ${failedEvents.toLocaleString()}
- Authentication Failures: ${authFailures.toLocaleString()}

**User Activity:**
- Unique Users: ${uniqueUsers.toLocaleString()}
- Unique IP Addresses: ${uniqueIPs.toLocaleString()}

**Security Alerts:**
- Critical Alerts: ${criticalAlerts.toLocaleString()}
- High Severity: ${highAlerts.toLocaleString()}
- Total Alerts: ${securityAlerts?.length?.toLocaleString() || '0'}

**Security Status:** ${criticalAlerts > 0 ? '🚨 CRITICAL' : 
  highAlerts > 5 ? '⚠️ HIGH RISK' : 
  authFailures > 10 ? '⚡ ELEVATED' : '✅ NORMAL'}

**Period:** ${new Date(since).toLocaleString('id-ID')} - ${new Date().toLocaleString('id-ID')}
${tenantId ? `**Tenant Filter:** ${tenantId}` : '**Scope:** All Tenants'}`
          }
        ]
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error fetching security metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async getAuditLogs(args: any) {
    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', args.tenant_id)
        .order('created_at', { ascending: false })
        .limit(args.limit || 50)

      if (args.user_id) {
        query = query.eq('user_id', args.user_id)
      }

      if (args.action) {
        query = query.ilike('action', `%${args.action}%`)
      }

      if (args.level) {
        query = query.eq('level', args.level)
      }

      const { data: logs, error } = await query

      if (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch audit logs: ${error.message}`
        )
      }

      const logText = logs?.map(log => 
        `**${new Date(log.created_at).toLocaleString('id-ID')}** | ${log.level.toUpperCase()} | ${log.action}
User: ${log.user_id || 'System'} | IP: ${log.ip_address || 'N/A'} | Success: ${log.success ? '✅' : '❌'}
${log.error_message ? `Error: ${log.error_message}` : ''}
${log.metadata ? `Metadata: ${JSON.stringify(log.metadata, null, 2)}` : ''}
---`
      ).join('\n') || 'No audit logs found'

      return {
        content: [
          {
            type: 'text',
            text: `**Audit Logs**

**Filter:**
- Tenant: ${args.tenant_id}
${args.user_id ? `- User: ${args.user_id}` : ''}
${args.action ? `- Action: ${args.action}` : ''}
${args.level ? `- Level: ${args.level}` : ''}
- Limit: ${args.limit || 50}

**Results (${logs?.length || 0} logs):**

${logText}`
          }
        ]
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Error fetching audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async validateSecurityConfig() {
    try {
      const validation = validateSecurityConfig()
      
      const configStatus = {
        environment_vars: validation.isValid,
        rate_limiting: !!securityConfig.rateLimit,
        security_headers: !!securityConfig.securityHeaders,
        audit_logging: securityConfig.audit?.enabled || false,
        csrf_protection: !!securityConfig.csrf,
        password_policy: !!securityConfig.password,
        file_upload_security: !!securityConfig.upload,
        cooperative_limits: !!securityConfig.cooperative?.transactionLimits
      }

      const passedChecks = Object.values(configStatus).filter(Boolean).length
      const totalChecks = Object.keys(configStatus).length

      return {
        content: [
          {
            type: 'text',
            text: `**Security Configuration Validation**

**Overall Status:** ${validation.isValid && passedChecks === totalChecks ? '✅ SECURE' : '⚠️ NEEDS ATTENTION'}

**Configuration Checks:**
- Environment Variables: ${configStatus.environment_vars ? '✅' : '❌'}
- Rate Limiting: ${configStatus.rate_limiting ? '✅' : '❌'}
- Security Headers: ${configStatus.security_headers ? '✅' : '❌'}
- Audit Logging: ${configStatus.audit_logging ? '✅' : '❌'}
- CSRF Protection: ${configStatus.csrf_protection ? '✅' : '❌'}
- Password Policy: ${configStatus.password_policy ? '✅' : '❌'}
- File Upload Security: ${configStatus.file_upload_security ? '✅' : '❌'}
- Cooperative Limits: ${configStatus.cooperative_limits ? '✅' : '❌'}

**Score:** ${passedChecks}/${totalChecks} checks passed

${validation.errors.length > 0 ? `**Errors:**
${validation.errors.map(error => `- ❌ ${error}`).join('\n')}` : ''}

**Rate Limits:**
- General API: ${securityConfig.rateLimit.general.maxRequests}/min
- Authentication: ${securityConfig.rateLimit.auth.maxRequests}/15min
- Admin: ${securityConfig.rateLimit.admin.maxRequests}/min
- Upload: ${securityConfig.rateLimit.upload.maxRequests}/min

**Transaction Limits:**
- Max Deposit/Day: Rp ${securityConfig.cooperative.transactionLimits.maxDepositPerDay.toLocaleString('id-ID')}
- Max Withdrawal/Day: Rp ${securityConfig.cooperative.transactionLimits.maxWithdrawalPerDay.toLocaleString('id-ID')}
- Max Transfer/Day: Rp ${securityConfig.cooperative.transactionLimits.maxTransferPerDay.toLocaleString('id-ID')}

**Recommendations:**
${validation.isValid && passedChecks === totalChecks ? 
  '✅ Configuration is secure and ready for production' :
  '⚠️ Please address the failed checks above before deploying to production'}

**Last Checked:** ${new Date().toLocaleString('id-ID')}`
          }
        ]
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error validating security config: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Validate security configuration on startup
    const validation = validateSecurityConfig()
    if (!validation.isValid) {
      console.error('❌ Security configuration invalid:', validation.errors)
      throw new Error('Security configuration validation failed')
    }

    console.log('🔒 Sinoman MCP Server with Security Integration')
    console.log('✅ Security configuration validated')
    console.log('🚀 Server ready to handle cooperative operations securely')

    this.isInitialized = true
  }

  async run(): Promise<void> {
    await this.initialize()

    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    // Log server startup
    await auditLogger.log({
      level: 'info',
      action: 'mcp_server_start',
      resource: 'mcp_server',
      success: true,
      metadata: {
        server_name: 'sinoman-cooperative-server',
        version: '1.0.0',
        security_enabled: true
      }
    })
  }
}

// Run server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SinomanMCPServer()
  server.run().catch((error) => {
    console.error('❌ Server error:', error)
    process.exit(1)
  })
}

export default SinomanMCPServer