import { createServerClient } from '@/lib/supabase/server'
import { mcp } from '@/lib/mcp-integration'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

type FitProgressWeekly = Database['public']['Tables']['fit_progress_weekly']['Row']
type FitActivityDaily = Database['public']['Tables']['fit_activities_daily']['Row']

// POST - Submit weekly progress
export async function POST(request: NextRequest) {
  try {
    await mcp.connect()
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      participant_id, 
      week_number, 
      measurements, 
      photos, 
      performance, 
      goals, 
      attendance 
    } = body

    // Validate required fields
    if (!participant_id || !week_number) {
      return NextResponse.json({ 
        error: 'Participant ID and week number are required' 
      }, { status: 400 })
    }

    // Verify participant belongs to user
    const { data: participant } = await supabase
      .from('fit_participants')
      .select('id, member_id, challenge_id, status')
      .eq('id', participant_id)
      .eq('member_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ 
        error: 'Participant not found or access denied' 
      }, { status: 404 })
    }

    if (participant.status !== 'active' && participant.status !== 'registered') {
      return NextResponse.json({ 
        error: 'Cannot submit progress for inactive participant' 
      }, { status: 400 })
    }

    // Check if progress already exists for this week
    const { data: existingProgress } = await supabase
      .from('fit_progress_weekly')
      .select('id')
      .eq('participant_id', participant_id)
      .eq('week_number', week_number)
      .single()

    const progressData = {
      participant_id,
      week_number,
      measurement_date: new Date().toISOString().split('T')[0],
      
      // Body measurements
      weight: measurements?.weight,
      body_fat_percentage: measurements?.body_fat,
      muscle_mass: measurements?.muscle_mass,
      waist_circumference: measurements?.waist,
      chest_circumference: measurements?.chest,
      arm_circumference: measurements?.arm,
      
      // Progress photos
      front_photo_url: photos?.front,
      side_photo_url: photos?.side,
      back_photo_url: photos?.back,
      
      // Performance metrics
      cardio_endurance_score: performance?.cardio,
      strength_score: performance?.strength,
      flexibility_score: performance?.flexibility,
      
      // Weekly goals and achievements
      weekly_goal: goals?.goal,
      weekly_achievement: goals?.achievement,
      challenges_faced: goals?.challenges,
      
      // Attendance
      sessions_attended: attendance?.attended || 0,
      sessions_scheduled: attendance?.scheduled || 3
    }

    let result
    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('fit_progress_weekly')
        .update(progressData)
        .eq('id', existingProgress.id)
        .select()
        .single()
      
      result = { data, error }
    } else {
      // Insert new progress
      const { data, error } = await supabase
        .from('fit_progress_weekly')
        .insert(progressData)
        .select()
        .single()
      
      result = { data, error }
    }

    if (result.error) {
      console.error('Progress submission error:', result.error)
      return NextResponse.json({ 
        error: 'Failed to submit progress' 
      }, { status: 500 })
    }

    // Update participant attendance count
    const totalAttended = attendance?.attended || 0
    const { error: updateError } = await supabase
      .from('fit_participants')
      .update({ 
        attendance_count: supabase.raw(`attendance_count + ${totalAttended}`),
        total_sessions: supabase.raw(`total_sessions + ${attendance?.scheduled || 3}`),
        current_weight: measurements?.weight || supabase.raw('current_weight'),
        current_body_fat: measurements?.body_fat || supabase.raw('current_body_fat'),
        current_muscle_mass: measurements?.muscle_mass || supabase.raw('current_muscle_mass')
      })
      .eq('id', participant_id)

    if (updateError) {
      console.error('Participant update error:', updateError)
    }

    // Update leaderboard scores
    await updateLeaderboardScores(supabase, participant.challenge_id, participant_id)

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_type: 'member',
      action: existingProgress ? 'update_fit_progress' : 'submit_fit_progress',
      table_name: 'fit_progress_weekly',
      record_id: result.data.id,
      new_values: { week_number, participant_id }
    })

    return NextResponse.json({
      success: true,
      data: result.data,
      message: existingProgress ? 'Progress updated successfully' : 'Progress submitted successfully'
    })

  } catch (error) {
    console.error('Submit progress error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// GET - Get progress for a participant
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
    const participantId = searchParams.get('participant_id')
    const weekNumber = searchParams.get('week_number')

    if (!participantId) {
      return NextResponse.json({ 
        error: 'Participant ID is required' 
      }, { status: 400 })
    }

    // Verify access to participant
    const { data: participant } = await supabase
      .from('fit_participants')
      .select('member_id, challenge_id')
      .eq('id', participantId)
      .single()

    if (!participant || participant.member_id !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('fit_progress_weekly')
      .select('*')
      .eq('participant_id', participantId)
      .order('week_number', { ascending: true })

    if (weekNumber) {
      query = query.eq('week_number', parseInt(weekNumber))
    }

    const { data: progressData, error } = await query

    if (error) {
      console.error('Progress query error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    // Get daily activities for the same period
    const { data: dailyActivities } = await supabase
      .from('fit_activities_daily')
      .select('*')
      .eq('participant_id', participantId)
      .order('activity_date', { ascending: false })
      .limit(30) // Last 30 days

    return NextResponse.json({
      success: true,
      data: {
        weekly_progress: progressData,
        daily_activities: dailyActivities
      }
    })

  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to update leaderboard scores
async function updateLeaderboardScores(supabase: any, challengeId: string, participantId: string) {
  try {
    // Get participant's initial and current measurements
    const { data: participant } = await supabase
      .from('fit_participants')
      .select('initial_weight, current_weight, initial_body_fat, current_body_fat, initial_muscle_mass, current_muscle_mass, attendance_count, total_sessions')
      .eq('id', participantId)
      .single()

    if (!participant) return

    // Calculate scores
    const weightLossScore = participant.initial_weight && participant.current_weight 
      ? Math.max(0, ((participant.initial_weight - participant.current_weight) / participant.initial_weight) * 100)
      : 0

    const bodyFatReductionScore = participant.initial_body_fat && participant.current_body_fat
      ? Math.max(0, ((participant.initial_body_fat - participant.current_body_fat) / participant.initial_body_fat) * 100)
      : 0

    const muscleGainScore = participant.initial_muscle_mass && participant.current_muscle_mass
      ? Math.max(0, ((participant.current_muscle_mass - participant.initial_muscle_mass) / participant.initial_muscle_mass) * 100)
      : 0

    const attendanceScore = participant.total_sessions > 0
      ? (participant.attendance_count / participant.total_sessions) * 100
      : 0

    // Get consistency score from recent weekly submissions
    const { data: recentProgress } = await supabase
      .from('fit_progress_weekly')
      .select('week_number')
      .eq('participant_id', participantId)
      .order('week_number', { ascending: false })
      .limit(4)

    const consistencyScore = recentProgress ? (recentProgress.length / 4) * 100 : 0

    // Calculate improvement score (average of all scores)
    const improvementScore = (weightLossScore + bodyFatReductionScore + muscleGainScore + attendanceScore + consistencyScore) / 5

    const totalScore = weightLossScore + bodyFatReductionScore + muscleGainScore + attendanceScore + consistencyScore + improvementScore

    // Update leaderboard
    await supabase
      .from('fit_leaderboard')
      .upsert({
        challenge_id: challengeId,
        participant_id: participantId,
        weight_loss_score: Math.round(weightLossScore * 100) / 100,
        body_fat_reduction_score: Math.round(bodyFatReductionScore * 100) / 100,
        muscle_gain_score: Math.round(muscleGainScore * 100) / 100,
        attendance_score: Math.round(attendanceScore * 100) / 100,
        consistency_score: Math.round(consistencyScore * 100) / 100,
        improvement_score: Math.round(improvementScore * 100) / 100,
        total_score: Math.round(totalScore * 100) / 100,
        last_calculated: new Date().toISOString()
      })

  } catch (error) {
    console.error('Leaderboard update error:', error)
  }
}