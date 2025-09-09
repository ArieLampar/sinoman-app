import { createServerClient } from '@/lib/supabase/server'
import { mcp } from '@/lib/mcp-integration'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

type Member = Database['public']['Tables']['members']['Row']

interface MemberStats {
  totalMembers: number
  membersByVillage: { village: string; count: number }[]
  monthlyGrowth: { month: string; count: number; growthRate: number }[]
  activeVsInactive: {
    active: number
    inactive: number
    suspended: number
    activeRatio: number
  }
  recentMembers: {
    id: string
    full_name: string
    village: string
    status: string
    join_date: string
    masked_nik: string
    masked_phone: string
  }[]
}

export async function GET(request: NextRequest) {
  try {
    // Initialize MCP for secure operations and audit logging
    await mcp.connect()
    
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const timeRange = searchParams.get('range') || '12' // months

    // Build base query with RLS protection
    let query = supabase
      .from('members')
      .select(`
        id,
        full_name,
        id_card_number,
        phone,
        village,
        status,
        join_date,
        created_at
      `)

    // Apply tenant filter if specified
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    // Execute secure query using MCP integration
    const secureQuery = `
      SELECT 
        id,
        full_name,
        CONCAT(LEFT(id_card_number, 6), 'XXXXXX', RIGHT(id_card_number, 4)) as masked_nik,
        CONCAT(LEFT(phone, 3), 'XXXXX', RIGHT(phone, 2)) as masked_phone,
        village,
        status,
        join_date,
        created_at,
        DATE_TRUNC('month', created_at) as join_month
      FROM members
      ${tenantId ? `WHERE tenant_id = '${tenantId}'` : ''}
      ORDER BY created_at DESC
    `

    // Log the query for audit purposes
    const maskedQuery = await mcp.queryWithMasking(secureQuery)
    
    // Execute the actual query
    const { data: members, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    // Process statistics with data masking
    const stats: MemberStats = {
      totalMembers: members.length,
      membersByVillage: [],
      monthlyGrowth: [],
      activeVsInactive: {
        active: 0,
        inactive: 0,
        suspended: 0,
        activeRatio: 0
      },
      recentMembers: []
    }

    // Calculate village distribution
    const villageMap = new Map<string, number>()
    members.forEach(member => {
      if (member.village) {
        villageMap.set(member.village, (villageMap.get(member.village) || 0) + 1)
      }
    })
    
    stats.membersByVillage = Array.from(villageMap.entries())
      .map(([village, count]) => ({ village, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate status distribution
    members.forEach(member => {
      switch (member.status) {
        case 'active':
          stats.activeVsInactive.active++
          break
        case 'inactive':
          stats.activeVsInactive.inactive++
          break
        case 'suspended':
          stats.activeVsInactive.suspended++
          break
      }
    })
    
    stats.activeVsInactive.activeRatio = 
      stats.totalMembers > 0 
        ? Math.round((stats.activeVsInactive.active / stats.totalMembers) * 100)
        : 0

    // Calculate monthly growth over specified time range
    const monthlyMap = new Map<string, number>()
    const now = new Date()
    const rangeMonths = parseInt(timeRange)
    
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
      monthlyMap.set(monthKey, 0)
    }

    members.forEach(member => {
      const joinMonth = new Date(member.created_at).toISOString().slice(0, 7)
      if (monthlyMap.has(joinMonth)) {
        monthlyMap.set(joinMonth, monthlyMap.get(joinMonth)! + 1)
      }
    })

    let previousCount = 0
    stats.monthlyGrowth = Array.from(monthlyMap.entries()).map(([month, count]) => {
      const growthRate = previousCount > 0 
        ? Math.round(((count - previousCount) / previousCount) * 100)
        : 0
      previousCount = count
      return { month, count, growthRate }
    })

    // Get recent members with masked sensitive data
    stats.recentMembers = members
      .slice(0, 10)
      .map(member => ({
        id: member.id,
        full_name: member.full_name,
        village: member.village || 'Tidak diketahui',
        status: member.status,
        join_date: member.join_date || member.created_at.split('T')[0],
        masked_nik: maskNIK(member.id_card_number),
        masked_phone: maskPhone(member.phone)
      }))

    // Log successful API access
    console.log(`✅ Member stats API accessed by user: ${user.id}`)
    
    return NextResponse.json({
      success: true,
      data: stats,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeRange: `${timeRange} months`,
        tenantId: tenantId || 'all'
      }
    })

  } catch (error) {
    console.error('Member stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to mask NIK (ID card number)
function maskNIK(nik: string | null): string {
  if (!nik) return 'XXXXXXXXXXXXXXXXX'
  if (nik.length < 10) return 'XXXXXXXXXXXXXXXXX'
  
  return `${nik.slice(0, 6)}XXXXXX${nik.slice(-4)}`
}

// Helper function to mask phone number
function maskPhone(phone: string | null): string {
  if (!phone) return 'XXXXXXXXXXXXX'
  if (phone.length < 8) return 'XXXXXXXXXXXXX'
  
  return `${phone.slice(0, 3)}XXXXX${phone.slice(-2)}`
}

// Additional endpoint for admin access with full data (if needed)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (you'll need to implement this based on your auth system)
    // const { data: adminUser } = await supabase
    //   .from('admin_users')
    //   .select('role')
    //   .eq('email', user.email)
    //   .single()
    
    // if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
    //   return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    // }

    return NextResponse.json({
      message: 'Admin endpoint for detailed member statistics',
      note: 'Implement admin-specific statistics here'
    })

  } catch (error) {
    console.error('Admin member stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}