import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      tenant_id,
      fresh_maggot_kg,
      dried_maggot_kg,
      compost_kg,
      quality_grade = 'standard',
      moisture_content,
      protein_content,
      selling_price_per_kg,
      buyer_info,
      notes
    } = body

    if (!tenant_id || !fresh_maggot_kg) {
      return NextResponse.json(
        { success: false, error: 'tenant_id and fresh_maggot_kg are required' },
        { status: 400 }
      )
    }

    const batchId = params.id

    // Fetch batch details
    const { data: batch, error: batchError } = await supabase
      .from('maggot_batches')
      .select('*')
      .eq('id', batchId)
      .eq('tenant_id', tenant_id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { success: false, error: 'Maggot batch not found' },
        { status: 404 }
      )
    }

    if (batch.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only active batches can be harvested' },
        { status: 400 }
      )
    }

    // Create harvest record
    const { data: harvest, error: harvestError } = await supabase
      .from('maggot_harvests')
      .insert({
        batch_id: batchId,
        harvester_id: user.id,
        fresh_maggot_kg: parseFloat(fresh_maggot_kg),
        dried_maggot_kg: dried_maggot_kg ? parseFloat(dried_maggot_kg) : null,
        compost_kg: compost_kg ? parseFloat(compost_kg) : null,
        quality_grade,
        moisture_content: moisture_content ? parseFloat(moisture_content) : null,
        protein_content: protein_content ? parseFloat(protein_content) : null,
        selling_price_per_kg: selling_price_per_kg ? parseFloat(selling_price_per_kg) : null,
        buyer_info: buyer_info || null,
        notes
      })
      .select(`
        *,
        harvester:harvester_id(full_name, phone),
        batch:batch_id(batch_number, total_organic_waste_kg)
      `)
      .single()

    if (harvestError) {
      console.error('Error creating harvest record:', harvestError)
      return NextResponse.json(
        { success: false, error: 'Failed to create harvest record' },
        { status: 500 }
      )
    }

    // Calculate total harvests and update batch
    const { data: allHarvests } = await supabase
      .from('maggot_harvests')
      .select('fresh_maggot_kg')
      .eq('batch_id', batchId)

    const totalMaggotHarvested = allHarvests?.reduce((sum, h) => sum + h.fresh_maggot_kg, 0) || 0
    const actualConversionRate = batch.total_organic_waste_kg > 0 
      ? totalMaggotHarvested / batch.total_organic_waste_kg 
      : 0

    // Update batch with harvest totals and conversion rate
    const { error: updateBatchError } = await supabase
      .from('maggot_batches')
      .update({
        actual_maggot_yield_kg: totalMaggotHarvested,
        conversion_rate: actualConversionRate,
        actual_harvest_date: new Date().toISOString(),
        status: 'harvested', // Mark as harvested after first harvest
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)

    if (updateBatchError) {
      console.error('Error updating batch:', updateBatchError)
      // Don't fail the harvest creation, just log the error
    }

    // Record environmental impact from compost production
    if (compost_kg && parseFloat(compost_kg) > 0) {
      await supabase
        .from('environmental_impacts')
        .insert({
          tenant_id,
          reference_type: 'harvest',
          reference_id: harvest.id,
          impact_type: 'compost_produced',
          quantity: parseFloat(compost_kg),
          unit: 'kg',
          calculation_method: 'Direct measurement of compost output'
        })
    }

    // Calculate harvest value if selling price provided
    const harvestValue = selling_price_per_kg 
      ? parseFloat(fresh_maggot_kg) * parseFloat(selling_price_per_kg)
      : 0

    // Distribute harvest revenue to contributing members if applicable
    if (harvestValue > 0) {
      await distributeHarvestRevenue(supabase, tenant_id, batchId, harvestValue)
    }

    return NextResponse.json({
      success: true,
      data: harvest,
      batch_summary: {
        total_maggot_harvested_kg: totalMaggotHarvested,
        conversion_rate: actualConversionRate,
        harvest_value: harvestValue
      },
      message: 'Maggot harvest recorded successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const batchId = params.id

    // Fetch all harvests for this batch
    const { data: harvests, error } = await supabase
      .from('maggot_harvests')
      .select(`
        *,
        harvester:harvester_id(
          id,
          full_name,
          phone
        ),
        batch:batch_id(
          batch_number,
          total_organic_waste_kg,
          estimated_maggot_yield_kg
        )
      `)
      .eq('batch_id', batchId)
      .order('harvest_date', { ascending: false })

    if (error) {
      console.error('Error fetching harvests:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch harvests' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const totalFreshMaggot = harvests?.reduce((sum, h) => sum + h.fresh_maggot_kg, 0) || 0
    const totalDriedMaggot = harvests?.reduce((sum, h) => sum + (h.dried_maggot_kg || 0), 0) || 0
    const totalCompost = harvests?.reduce((sum, h) => sum + (h.compost_kg || 0), 0) || 0
    const totalRevenue = harvests?.reduce((sum, h) => 
      sum + (h.fresh_maggot_kg * (h.selling_price_per_kg || 0)), 0) || 0

    const batch = harvests?.[0]?.batch
    const conversionRate = batch?.total_organic_waste_kg > 0 
      ? totalFreshMaggot / batch.total_organic_waste_kg 
      : 0

    const efficiency = batch?.estimated_maggot_yield_kg > 0 
      ? (totalFreshMaggot / batch.estimated_maggot_yield_kg) * 100 
      : 0

    return NextResponse.json({
      success: true,
      data: harvests,
      summary: {
        total_harvests: harvests?.length || 0,
        total_fresh_maggot_kg: totalFreshMaggot,
        total_dried_maggot_kg: totalDriedMaggot,
        total_compost_kg: totalCompost,
        total_revenue: totalRevenue,
        conversion_rate: conversionRate,
        efficiency_percentage: efficiency
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function distributeHarvestRevenue(
  supabase: any,
  tenantId: string,
  batchId: string,
  totalRevenue: number
) {
  try {
    // Get all inputs for this batch with member information
    const { data: inputs, error: inputsError } = await supabase
      .from('maggot_batch_inputs')
      .select(`
        *,
        collection_item:collection_item_id(
          quantity,
          collection:collection_id(
            member_id,
            member:member_id(full_name)
          )
        )
      `)
      .eq('batch_id', batchId)

    if (inputsError || !inputs?.length) {
      console.error('Error fetching batch inputs:', inputsError)
      return
    }

    // Calculate total input weight
    const totalInputWeight = inputs.reduce((sum, input) => sum + input.quantity_kg, 0)
    
    if (totalInputWeight === 0) return

    // Group by member and calculate proportional shares
    const memberShares = inputs.reduce((acc, input) => {
      const memberId = input.collection_item?.collection?.member_id
      if (!memberId) return acc

      if (!acc[memberId]) {
        acc[memberId] = {
          member_id: memberId,
          member_name: input.collection_item?.collection?.member?.full_name,
          total_contribution_kg: 0,
          revenue_share: 0
        }
      }

      acc[memberId].total_contribution_kg += input.quantity_kg
      
      return acc
    }, {} as Record<string, any>)

    // Calculate revenue shares (80% to contributors, 20% to cooperative)
    const contributorRevenue = totalRevenue * 0.8
    
    for (const memberId in memberShares) {
      const share = memberShares[memberId]
      const proportion = share.total_contribution_kg / totalInputWeight
      share.revenue_share = contributorRevenue * proportion

      // Add bonus to waste bank account
      if (share.revenue_share > 0) {
        await addMaggotBonus(supabase, tenantId, memberId, share.revenue_share, batchId)
      }
    }

    console.log('Revenue distributed:', memberShares)
    
  } catch (error) {
    console.error('Error distributing harvest revenue:', error)
  }
}

async function addMaggotBonus(
  supabase: any,
  tenantId: string,
  memberId: string,
  bonusAmount: number,
  batchId: string
) {
  try {
    // Get member's waste bank account
    const { data: account, error: accountError } = await supabase
      .from('waste_bank_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('member_id', memberId)
      .single()

    if (accountError || !account) {
      console.error('Waste bank account not found for member:', memberId)
      return
    }

    // Create bonus transaction
    await supabase
      .from('waste_bank_transactions')
      .insert({
        account_id: account.id,
        transaction_type: 'bonus',
        reference_type: 'harvest_bonus',
        reference_id: batchId,
        amount: bonusAmount,
        balance_before: account.current_balance,
        balance_after: account.current_balance + bonusAmount,
        description: `Bonus dari hasil panen maggot batch ${batchId}`,
        processed_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error adding maggot bonus:', error)
  }
}