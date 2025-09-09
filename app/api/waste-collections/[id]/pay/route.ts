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
      payment_method = 'savings_account', // cash, savings_account, bank_transfer
      payment_reference,
      notes
    } = body

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const collectionId = params.id

    // Fetch collection with items
    const { data: collection, error: collectionError } = await supabase
      .from('waste_collections')
      .select(`
        *,
        member:member_id(
          id,
          full_name,
          phone,
          email
        ),
        waste_collection_items(
          *,
          waste_type:waste_type_id(
            name,
            category,
            is_organic,
            suitable_for_maggot
          )
        )
      `)
      .eq('id', collectionId)
      .eq('tenant_id', tenant_id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Check if already paid
    if (collection.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Collection has already been paid' },
        { status: 409 }
      )
    }

    // Check if collection is processed/weighed
    if (collection.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Collection must be weighed and processed before payment' },
        { status: 400 }
      )
    }

    // Get or create waste bank account
    let { data: account, error: accountError } = await supabase
      .from('waste_bank_accounts')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('member_id', collection.member_id)
      .single()

    if (accountError && accountError.code === 'PGRST116') {
      // Account doesn't exist, create it
      const accountNumber = await generateAccountNumber(supabase, tenant_id)
      
      const { data: newAccount, error: createError } = await supabase
        .from('waste_bank_accounts')
        .insert({
          tenant_id,
          member_id: collection.member_id,
          account_number: accountNumber,
          current_balance: 0,
          total_waste_kg: 0,
          account_status: 'active'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating waste bank account:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create waste bank account' },
          { status: 500 }
        )
      }

      account = newAccount
    } else if (accountError) {
      console.error('Error fetching waste bank account:', accountError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch waste bank account' },
        { status: 500 }
      )
    }

    // Process payment based on method
    let transactionData
    if (payment_method === 'savings_account') {
      // Add to waste bank savings
      transactionData = await processWasteBankPayment(
        supabase, 
        account!, 
        collection, 
        payment_reference,
        notes,
        user.id
      )
    } else if (payment_method === 'cash') {
      // Cash payment - just update collection status
      transactionData = await processCashPayment(
        supabase,
        collection,
        payment_reference,
        notes,
        user.id
      )
    } else if (payment_method === 'bank_transfer') {
      // Bank transfer - update collection and create transaction record
      transactionData = await processBankTransferPayment(
        supabase,
        account!,
        collection,
        payment_reference,
        notes,
        user.id
      )
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    if (!transactionData.success) {
      return NextResponse.json(
        { success: false, error: transactionData.error },
        { status: 500 }
      )
    }

    // Update collection payment status
    const { error: updateError } = await supabase
      .from('waste_collections')
      .update({
        payment_status: 'paid',
        payment_method,
        payment_date: new Date().toISOString(),
        payment_reference,
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', collectionId)

    if (updateError) {
      console.error('Error updating collection:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update collection payment status' },
        { status: 500 }
      )
    }

    // Process organic waste for maggot farming if applicable
    await processOrganicForMaggot(supabase, tenant_id, collection)

    // Fetch updated collection
    const { data: updatedCollection, error: fetchError } = await supabase
      .from('waste_collections')
      .select(`
        *,
        member:member_id(full_name, phone),
        waste_collection_items(
          *,
          waste_type:waste_type_id(name, category, is_organic)
        )
      `)
      .eq('id', collectionId)
      .single()

    return NextResponse.json({
      success: true,
      data: updatedCollection,
      transaction: transactionData.transaction,
      account_balance: transactionData.account_balance,
      message: `Payment processed successfully via ${payment_method}`
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processWasteBankPayment(
  supabase: any,
  account: any,
  collection: any,
  paymentReference: string | undefined,
  notes: string | undefined,
  processedBy: string
) {
  try {
    // Create deposit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('waste_bank_transactions')
      .insert({
        account_id: account.id,
        transaction_type: 'deposit',
        reference_type: 'collection',
        reference_id: collection.id,
        amount: collection.total_value,
        balance_before: account.current_balance,
        balance_after: account.current_balance + collection.total_value,
        description: `Waste collection deposit: ${collection.collection_number}${notes ? ` - ${notes}` : ''}`,
        processed_by: processedBy
      })
      .select()
      .single()

    if (transactionError) {
      throw transactionError
    }

    return {
      success: true,
      transaction,
      account_balance: account.current_balance + collection.total_value
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to process waste bank payment'
    }
  }
}

async function processCashPayment(
  supabase: any,
  collection: any,
  paymentReference: string | undefined,
  notes: string | undefined,
  processedBy: string
) {
  try {
    return {
      success: true,
      transaction: {
        type: 'cash',
        amount: collection.total_value,
        reference: paymentReference,
        notes: notes,
        processed_by: processedBy
      },
      account_balance: null
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to process cash payment'
    }
  }
}

async function processBankTransferPayment(
  supabase: any,
  account: any,
  collection: any,
  paymentReference: string | undefined,
  notes: string | undefined,
  processedBy: string
) {
  try {
    // For bank transfer, we still create a transaction record for tracking
    const { data: transaction, error: transactionError } = await supabase
      .from('waste_bank_transactions')
      .insert({
        account_id: account.id,
        transaction_type: 'deposit',
        reference_type: 'collection',
        reference_id: collection.id,
        amount: collection.total_value,
        balance_before: account.current_balance,
        balance_after: account.current_balance + collection.total_value,
        description: `Bank transfer for collection: ${collection.collection_number}${notes ? ` - ${notes}` : ''}`,
        processed_by: processedBy
      })
      .select()
      .single()

    if (transactionError) {
      throw transactionError
    }

    return {
      success: true,
      transaction,
      account_balance: account.current_balance + collection.total_value
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to process bank transfer payment'
    }
  }
}

async function processOrganicForMaggot(
  supabase: any,
  tenantId: string,
  collection: any
) {
  try {
    // Find organic items suitable for maggot farming
    const organicItems = collection.waste_collection_items?.filter(
      (item: any) => item.waste_type?.suitable_for_maggot
    ) || []

    if (organicItems.length === 0) return

    // Check if there's an active maggot batch
    const { data: activeBatch, error: batchError } = await supabase
      .from('maggot_batches')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (batchError && batchError.code !== 'PGRST116') {
      console.error('Error checking active batch:', batchError)
      return
    }

    let batchId = activeBatch?.id

    // If no active batch, create one
    if (!activeBatch) {
      const batchNumber = await generateBatchNumber(supabase, tenantId)
      
      const { data: newBatch, error: createBatchError } = await supabase
        .from('maggot_batches')
        .insert({
          tenant_id: tenantId,
          batch_number: batchNumber,
          collection_point_id: collection.collection_point_id,
          manager_id: collection.collector_id,
          expected_harvest_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks
          status: 'active'
        })
        .select()
        .single()

      if (createBatchError) {
        console.error('Error creating maggot batch:', createBatchError)
        return
      }

      batchId = newBatch.id
    }

    // Allocate organic items to maggot batch (70% of quantity)
    for (const item of organicItems) {
      const allocationQuantity = item.quantity * 0.7 // 70% to maggot, 30% reserve

      // Create batch input record
      await supabase
        .from('maggot_batch_inputs')
        .insert({
          batch_id: batchId,
          collection_item_id: item.id,
          quantity_kg: allocationQuantity,
          waste_condition: 'fresh'
        })

      // Update collection item allocation
      await supabase
        .from('waste_collection_items')
        .update({
          allocated_to_maggot: allocationQuantity,
          processing_status: 'allocated'
        })
        .eq('id', item.id)
    }

  } catch (error) {
    console.error('Error processing organic for maggot:', error)
    // Don't throw - this is not critical for payment success
  }
}

async function generateAccountNumber(supabase: any, tenantId: string): Promise<string> {
  const { count } = await supabase
    .from('waste_bank_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const sequence = String((count || 0) + 1).padStart(6, '0')
  return `WB${sequence}`
}

async function generateBatchNumber(supabase: any, tenantId: string): Promise<string> {
  const today = new Date()
  const yearMonth = today.toISOString().slice(0, 7).replace('-', '')
  
  const { count } = await supabase
    .from('maggot_batches')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('start_date', `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)

  const sequence = String((count || 0) + 1).padStart(3, '0')
  return `MB-${yearMonth}-${sequence}`
}