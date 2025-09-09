import { createServerClient } from '@/lib/supabase/server'
import { mcp } from '@/lib/mcp-integration'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

type FitParticipant = Database['public']['Tables']['fit_participants']['Row']

// POST - Register for a Fit Challenge
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
    const { challenge_id, initial_measurements, health_info, emergency_contact } = body

    if (!challenge_id) {
      return NextResponse.json({ 
        error: 'Challenge ID is required' 
      }, { status: 400 })
    }

    // Check if challenge exists and is open for registration
    const { data: challenge, error: challengeError } = await supabase
      .from('fit_challenges')
      .select('*')
      .eq('id', challenge_id)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ 
        error: 'Challenge not found' 
      }, { status: 404 })
    }

    // Validate registration conditions
    const now = new Date()
    const registrationDeadline = new Date(challenge.registration_deadline)
    
    if (now > registrationDeadline) {
      return NextResponse.json({ 
        error: 'Registration deadline has passed' 
      }, { status: 400 })
    }

    if (challenge.current_participants >= challenge.max_participants) {
      return NextResponse.json({ 
        error: 'Challenge is full' 
      }, { status: 400 })
    }

    if (challenge.status !== 'upcoming' && challenge.status !== 'active') {
      return NextResponse.json({ 
        error: 'Challenge is not available for registration' 
      }, { status: 400 })
    }

    // Check if user is already registered
    const { data: existingParticipant } = await supabase
      .from('fit_participants')
      .select('id')
      .eq('member_id', user.id)
      .eq('challenge_id', challenge_id)
      .single()

    if (existingParticipant) {
      return NextResponse.json({ 
        error: 'You are already registered for this challenge' 
      }, { status: 400 })
    }

    // Get member information
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ 
        error: 'Member profile not found' 
      }, { status: 404 })
    }

    // Generate registration number
    const registrationNumber = `FIT${challenge.batch_number.toString().padStart(2, '0')}${String(challenge.current_participants + 1).padStart(3, '0')}`

    // Prepare participant data
    const participantData = {
      member_id: user.id,
      challenge_id: challenge_id,
      registration_number: registrationNumber,
      payment_status: 'pending' as const,
      
      // Initial measurements
      initial_weight: initial_measurements?.weight,
      initial_height: initial_measurements?.height,
      initial_body_fat: initial_measurements?.body_fat,
      initial_muscle_mass: initial_measurements?.muscle_mass,
      initial_notes: initial_measurements?.notes,
      
      // Target measurements
      target_weight: initial_measurements?.target_weight,
      target_body_fat: initial_measurements?.target_body_fat,
      target_muscle_mass: initial_measurements?.target_muscle_mass,
      
      // Health and emergency info
      health_conditions: health_info?.conditions,
      emergency_contact: emergency_contact?.name,
      emergency_phone: emergency_contact?.phone,
      motivation_notes: health_info?.motivation,
      
      // Initialize counters
      attendance_count: 0,
      total_sessions: 0,
      attendance_percentage: 0,
      
      status: 'registered' as const
    }

    // Insert participant record
    const { data: participant, error: participantError } = await supabase
      .from('fit_participants')
      .insert(participantData)
      .select()
      .single()

    if (participantError) {
      console.error('Participant registration error:', participantError)
      return NextResponse.json({ 
        error: 'Failed to register participant' 
      }, { status: 500 })
    }

    // Update challenge participant count
    const { error: updateError } = await supabase
      .from('fit_challenges')
      .update({ 
        current_participants: challenge.current_participants + 1 
      })
      .eq('id', challenge_id)

    if (updateError) {
      console.error('Challenge update error:', updateError)
      // Rollback participant registration
      await supabase
        .from('fit_participants')
        .delete()
        .eq('id', participant.id)
      
      return NextResponse.json({ 
        error: 'Failed to update challenge' 
      }, { status: 500 })
    }

    // Create initial leaderboard entry
    await supabase
      .from('fit_leaderboard')
      .insert({
        challenge_id: challenge_id,
        participant_id: participant.id,
        weight_loss_score: 0,
        body_fat_reduction_score: 0,
        muscle_gain_score: 0,
        attendance_score: 0,
        consistency_score: 0,
        improvement_score: 0,
        total_score: 0
      })

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_type: 'member',
      action: 'register_fit_challenge',
      table_name: 'fit_participants',
      record_id: participant.id,
      new_values: { challenge_id, registration_number }
    })

    // Create notification
    await supabase.from('notifications').insert({
      recipient_id: user.id,
      recipient_type: 'member',
      title: 'Pendaftaran Fit Challenge Berhasil',
      message: `Anda berhasil mendaftar untuk ${challenge.challenge_name}. Nomor registrasi: ${registrationNumber}`,
      type: 'success',
      category: 'fit_challenge',
      data: { 
        challenge_id, 
        participant_id: participant.id,
        registration_number: registrationNumber
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        participant,
        challenge: {
          id: challenge.id,
          name: challenge.challenge_name,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          trainer_name: challenge.trainer_name
        },
        payment_info: {
          amount: challenge.registration_fee,
          status: 'pending',
          deadline: challenge.registration_deadline
        }
      },
      message: 'Successfully registered for Fit Challenge'
    })

  } catch (error) {
    console.error('Fit Challenge registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// GET - Get user's registrations
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
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('fit_participants')
      .select(`
        *,
        fit_challenges (
          id,
          challenge_name,
          start_date,
          end_date,
          trainer_name,
          location,
          photo_url,
          status
        )
      `)
      .eq('member_id', user.id)
      .order('registration_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: registrations, error } = await query

    if (error) {
      console.error('Registration query error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: registrations,
      total: registrations?.length || 0
    })

  } catch (error) {
    console.error('Get registrations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}