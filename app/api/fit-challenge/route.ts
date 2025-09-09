import { createServerClient } from '@/lib/supabase/server'
import { mcp } from '@/lib/mcp-integration'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

type FitChallenge = Database['public']['Tables']['fit_challenges']['Row']

// GET - List all available challenges
export async function GET(request: NextRequest) {
  try {
    await mcp.connect()
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = supabase
      .from('fit_challenges')
      .select(`
        id,
        challenge_code,
        challenge_name,
        description,
        batch_number,
        start_date,
        end_date,
        registration_deadline,
        registration_fee,
        max_participants,
        current_participants,
        trainer_name,
        trainer_photo_url,
        location,
        schedule_days,
        schedule_time,
        requirements,
        prizes_info,
        status,
        featured,
        photo_url,
        created_at
      `)
      .eq('status', status)
      .order('start_date', { ascending: true })
      .limit(limit)

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    // Execute secure query with MCP
    const secureQuery = `
      SELECT id, challenge_code, challenge_name, description, batch_number, 
             start_date, end_date, registration_deadline, registration_fee,
             max_participants, current_participants, trainer_name, location,
             schedule_days, schedule_time, requirements, prizes_info, status,
             featured, photo_url, created_at
      FROM fit_challenges 
      WHERE status = '${status}' 
      ${featured === 'true' ? "AND featured = true" : ""}
      ORDER BY start_date ASC 
      LIMIT ${limit}
    `
    
    await mcp.queryWithMasking(secureQuery)

    const { data: challenges, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    // Add calculated fields
    const enhancedChallenges = challenges?.map(challenge => ({
      ...challenge,
      spots_remaining: challenge.max_participants - challenge.current_participants,
      registration_open: new Date(challenge.registration_deadline) > new Date(),
      days_until_start: Math.ceil((new Date(challenge.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }))

    return NextResponse.json({
      success: true,
      data: enhancedChallenges,
      total: challenges?.length || 0
    })

  } catch (error) {
    console.error('Fit Challenge API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// POST - Create new challenge (Admin only)
export async function POST(request: NextRequest) {
  try {
    await mcp.connect()
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!adminUser || !['admin', 'super_admin', 'trainer'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = [
      'challenge_name', 'start_date', 'end_date', 'registration_deadline',
      'max_participants', 'trainer_name'
    ]
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Generate challenge code
    const batchNumber = body.batch_number || 1
    const challengeCode = `FIT${new Date().getFullYear()}${String(batchNumber).padStart(2, '0')}`

    // Prepare challenge data
    const challengeData = {
      tenant_id: adminUser.tenant_id,
      challenge_code: challengeCode,
      challenge_name: body.challenge_name,
      description: body.description,
      batch_number: batchNumber,
      start_date: body.start_date,
      end_date: body.end_date,
      registration_deadline: body.registration_deadline,
      registration_fee: body.registration_fee || 600000,
      max_participants: body.max_participants,
      trainer_name: body.trainer_name,
      trainer_phone: body.trainer_phone,
      trainer_photo_url: body.trainer_photo_url,
      location: body.location,
      schedule_days: body.schedule_days,
      schedule_time: body.schedule_time,
      requirements: body.requirements,
      prizes_info: body.prizes_info,
      rules_regulation: body.rules_regulation,
      featured: body.featured || false,
      photo_url: body.photo_url,
      created_by: user.id
    }

    const { data: challenge, error } = await supabase
      .from('fit_challenges')
      .insert(challengeData)
      .select()
      .single()

    if (error) {
      console.error('Challenge creation error:', error)
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_type: 'admin',
      action: 'create_fit_challenge',
      table_name: 'fit_challenges',
      record_id: challenge.id,
      new_values: challengeData
    })

    return NextResponse.json({
      success: true,
      data: challenge,
      message: 'Fit Challenge created successfully'
    })

  } catch (error) {
    console.error('Create challenge error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}