'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ProfileFormData {
  full_name: string
  id_card_number: string
  phone: string
  date_of_birth?: string
  gender?: 'L' | 'P'
  occupation?: string
  address: string
  rt?: string
  rw?: string
  village?: string
  district?: string
}

export async function updateMemberProfile(
  memberId: string,
  data: ProfileFormData
) {
  try {
    const supabase = await createServerClient()

    // Update member profile
    const { error } = await supabase
      .from('members')
      .update({
        full_name: data.full_name,
        id_card_number: data.id_card_number,
        phone: data.phone,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        occupation: data.occupation || null,
        address: data.address,
        rt: data.rt || null,
        rw: data.rw || null,
        village: data.village || null,
        district: data.district || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating member profile:', error)
      return { error: 'Gagal memperbarui profil. Silakan coba lagi.' }
    }

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}

export async function createMemberProfile(
  userId: string,
  data: ProfileFormData
) {
  try {
    const supabase = await createServerClient()

    // Get user's email
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User tidak ditemukan.' }
    }

    // Generate member number (format: KOP-YYYYMMDD-XXXX)
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const memberNumber = `KOP-${dateStr}-${randomNum}`

    // Generate referral code
    const referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Get default tenant (you may want to adjust this logic)
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (tenantError || !tenantData) {
      return { error: 'Tenant tidak ditemukan. Hubungi admin.' }
    }

    // Create member record
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({
        id: userId, // Use auth user ID as member ID
        tenant_id: tenantData.id,
        member_number: memberNumber,
        full_name: data.full_name,
        email: user.email,
        id_card_number: data.id_card_number,
        phone: data.phone,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        occupation: data.occupation || null,
        address: data.address,
        rt: data.rt || null,
        rw: data.rw || null,
        village: data.village || null,
        district: data.district || null,
        join_date: today.toISOString(),
        referral_code: referralCode,
        status: 'active',
        photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error creating member:', memberError)
      return { error: 'Gagal membuat profil anggota. Silakan coba lagi.' }
    }

    // Create savings account for the member
    const accountNumber = `SAV-${memberNumber}`
    
    const { error: savingsError } = await supabase
      .from('savings_accounts')
      .insert({
        member_id: userId,
        tenant_id: tenantData.id,
        account_number: accountNumber,
        pokok_balance: 0,
        wajib_balance: 0,
        sukarela_balance: 0,
        total_balance: 0,
      })

    if (savingsError) {
      console.error('Error creating savings account:', savingsError)
      // Don't return error here, member is already created
    }

    // Create waste balance account
    const { error: wasteError } = await supabase
      .from('waste_balances')
      .insert({
        member_id: userId,
        tenant_id: tenantData.id,
        current_balance: 0,
        total_weight_collected_kg: 0,
        total_earnings: 0,
      })

    if (wasteError) {
      console.error('Error creating waste balance:', wasteError)
      // Don't return error here, member is already created
    }

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    
    return { success: true, data: memberData }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}

export async function uploadProfilePhoto(
  memberId: string,
  file: File
) {
  try {
    const supabase = await createServerClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${memberId}-${Date.now()}.${fileExt}`
    const filePath = `profile-photos/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return { error: 'Gagal mengunggah foto.' }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('member-photos')
      .getPublicUrl(filePath)

    // Update member profile with photo URL
    const { error: updateError } = await supabase
      .from('members')
      .update({
        photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error updating photo URL:', updateError)
      return { error: 'Gagal memperbarui foto profil.' }
    }

    revalidatePath('/profile')
    
    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: 'Terjadi kesalahan yang tidak terduga.' }
  }
}