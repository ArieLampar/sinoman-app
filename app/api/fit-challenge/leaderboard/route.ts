import { createServerClient } from '@/lib/supabase/server'
import { mcp } from '@/lib/mcp-integration'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

type FitLeaderboard = Database['public']['Tables']['fit_leaderboard']['Row']

// GET - Get leaderboard for a challenge
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
    const challengeId = searchParams.get('challenge_id')
    const category = searchParams.get('category') || 'total' // total, weight_loss, attendance, etc.
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!challengeId) {
      return NextResponse.json({ 
        error: 'Challenge ID is required' 
      }, { status: 400 })
    }

    // Verify challenge exists
    const { data: challenge } = await supabase
      .from('fit_challenges')
      .select('id, challenge_name, status')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ 
        error: 'Challenge not found' 
      }, { status: 404 })
    }

    // Build leaderboard query with masked data
    const { data: leaderboardData, error } = await supabase
      .from('fit_leaderboard')
      .select(`
        *,
        fit_participants!inner(
          id,
          member_id,
          registration_number,
          current_weight,
          target_weight,
          attendance_count,
          total_sessions,
          status,
          members!inner(
            full_name,
            photo_url
          )
        )
      `)
      .eq('challenge_id', challengeId)
      .eq('fit_participants.status', 'active')
      .order(getCategoryOrderField(category), { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Leaderboard query error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    // Process and rank the data
    const processedData = leaderboardData?.map((entry, index) => {
      const participant = entry.fit_participants
      const member = participant.members
      
      return {
        rank: index + 1,
        participant_id: participant.id,
        registration_number: participant.registration_number,
        member: {
          // Apply data masking for member info
          full_name: member.full_name,
          photo_url: member.photo_url,
          // Don't expose full member details
        },
        scores: {
          total_score: entry.total_score,
          weight_loss_score: entry.weight_loss_score,
          body_fat_reduction_score: entry.body_fat_reduction_score,
          muscle_gain_score: entry.muscle_gain_score,
          attendance_score: entry.attendance_score,
          consistency_score: entry.consistency_score,
          improvement_score: entry.improvement_score
        },
        progress: {
          current_weight: participant.current_weight,
          target_weight: participant.target_weight,
          attendance_rate: participant.total_sessions > 0 
            ? Math.round((participant.attendance_count / participant.total_sessions) * 100)
            : 0
        },
        badges: entry.badges || {},
        last_updated: entry.last_calculated
      }
    }) || []

    // Update ranks in database
    await updateRanks(supabase, challengeId, processedData)

    // Get user's position if they're a participant
    let userPosition = null
    const { data: userParticipant } = await supabase
      .from('fit_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('member_id', user.id)
      .single()

    if (userParticipant) {
      const userRank = processedData.findIndex(entry => 
        entry.participant_id === userParticipant.id
      )
      if (userRank !== -1) {
        userPosition = {
          rank: userRank + 1,
          score: processedData[userRank].scores.total_score
        }
      }
    }

    // Log secure query with MCP
    const secureQuery = `
      SELECT participant rankings for challenge ${challengeId}
      Category: ${category}, Limit: ${limit}
    `
    await mcp.queryWithMasking(secureQuery)

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: challenge.id,
          name: challenge.challenge_name,
          status: challenge.status
        },
        category,
        leaderboard: processedData,
        user_position: userPosition,
        total_participants: processedData.length,
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// POST - Manually trigger leaderboard recalculation (Admin only)
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
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminUser || !['admin', 'super_admin', 'trainer'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { challenge_id } = body

    if (!challenge_id) {
      return NextResponse.json({ 
        error: 'Challenge ID is required' 
      }, { status: 400 })
    }

    // Recalculate all leaderboard scores for the challenge
    const { data: participants } = await supabase
      .from('fit_participants')
      .select('id')
      .eq('challenge_id', challenge_id)
      .eq('status', 'active')

    if (!participants) {
      return NextResponse.json({ 
        error: 'No active participants found' 
      }, { status: 404 })
    }

    let updatedCount = 0
    for (const participant of participants) {
      try {
        await recalculateParticipantScore(supabase, challenge_id, participant.id)
        updatedCount++
      } catch (error) {
        console.error(`Failed to update participant ${participant.id}:`, error)
      }
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_type: 'admin',
      action: 'recalculate_leaderboard',
      table_name: 'fit_leaderboard',
      new_values: { challenge_id, participants_updated: updatedCount }
    })

    return NextResponse.json({
      success: true,
      message: `Leaderboard recalculated for ${updatedCount} participants`,
      data: { participants_updated: updatedCount }
    })

  } catch (error) {
    console.error('Leaderboard recalculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to get the order field for different categories
function getCategoryOrderField(category: string): string {
  switch (category) {
    case 'weight_loss':
      return 'weight_loss_score'
    case 'attendance':
      return 'attendance_score'
    case 'consistency':
      return 'consistency_score'
    case 'improvement':
      return 'improvement_score'
    case 'body_fat':
      return 'body_fat_reduction_score'
    case 'muscle_gain':
      return 'muscle_gain_score'
    default:
      return 'total_score'
  }
}

// Helper function to update ranks in database
async function updateRanks(supabase: any, challengeId: string, rankedData: any[]) {
  try {
    for (let i = 0; i < rankedData.length; i++) {
      const entry = rankedData[i]
      await supabase
        .from('fit_leaderboard')
        .update({ 
          current_rank: i + 1,
          previous_rank: entry.rank // This should be fetched from current data
        })
        .eq('challenge_id', challengeId)
        .eq('participant_id', entry.participant_id)
    }
  } catch (error) {
    console.error('Rank update error:', error)
  }
}

// Helper function to recalculate individual participant score
async function recalculateParticipantScore(supabase: any, challengeId: string, participantId: string) {
  // Get participant's measurements and attendance
  const { data: participant } = await supabase
    .from('fit_participants')
    .select('*')
    .eq('id', participantId)
    .single()

  if (!participant) return

  // Calculate various scores
  const weightLossScore = calculateWeightLossScore(participant)
  const bodyFatScore = calculateBodyFatScore(participant)
  const muscleGainScore = calculateMuscleGainScore(participant)
  const attendanceScore = calculateAttendanceScore(participant)
  
  // Get consistency score from weekly progress
  const { data: weeklyProgress } = await supabase
    .from('fit_progress_weekly')
    .select('week_number')
    .eq('participant_id', participantId)
    .order('week_number', { ascending: false })

  const consistencyScore = calculateConsistencyScore(weeklyProgress)
  const improvementScore = calculateImprovementScore([
    weightLossScore, bodyFatScore, muscleGainScore, attendanceScore, consistencyScore
  ])

  const totalScore = weightLossScore + bodyFatScore + muscleGainScore + 
                    attendanceScore + consistencyScore + improvementScore

  // Update leaderboard
  await supabase
    .from('fit_leaderboard')
    .upsert({
      challenge_id: challengeId,
      participant_id: participantId,
      weight_loss_score: Math.round(weightLossScore * 100) / 100,
      body_fat_reduction_score: Math.round(bodyFatScore * 100) / 100,
      muscle_gain_score: Math.round(muscleGainScore * 100) / 100,
      attendance_score: Math.round(attendanceScore * 100) / 100,
      consistency_score: Math.round(consistencyScore * 100) / 100,
      improvement_score: Math.round(improvementScore * 100) / 100,
      total_score: Math.round(totalScore * 100) / 100,
      last_calculated: new Date().toISOString()
    })
}

// Scoring calculation functions
function calculateWeightLossScore(participant: any): number {
  if (!participant.initial_weight || !participant.current_weight) return 0
  const lossPercentage = ((participant.initial_weight - participant.current_weight) / participant.initial_weight) * 100
  return Math.max(0, Math.min(100, lossPercentage * 10)) // Max 10% weight loss = 100 points
}

function calculateBodyFatScore(participant: any): number {
  if (!participant.initial_body_fat || !participant.current_body_fat) return 0
  const reductionPercentage = ((participant.initial_body_fat - participant.current_body_fat) / participant.initial_body_fat) * 100
  return Math.max(0, Math.min(100, reductionPercentage * 5)) // Max 20% body fat reduction = 100 points
}

function calculateMuscleGainScore(participant: any): number {
  if (!participant.initial_muscle_mass || !participant.current_muscle_mass) return 0
  const gainPercentage = ((participant.current_muscle_mass - participant.initial_muscle_mass) / participant.initial_muscle_mass) * 100
  return Math.max(0, Math.min(100, gainPercentage * 10)) // Max 10% muscle gain = 100 points
}

function calculateAttendanceScore(participant: any): number {
  if (participant.total_sessions === 0) return 0
  return (participant.attendance_count / participant.total_sessions) * 100
}

function calculateConsistencyScore(weeklyProgress: any[]): number {
  if (!weeklyProgress) return 0
  const weeksTracked = weeklyProgress.length
  const maxWeeks = 8 // 8-week program
  return Math.min(100, (weeksTracked / maxWeeks) * 100)
}

function calculateImprovementScore(scores: number[]): number {
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}