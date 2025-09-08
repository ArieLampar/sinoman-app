'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { loginSchema, registerSchema } from '@/lib/validations/auth-schemas'

// Types for actions
type LoginFormState = {
  errors?: {
    emailOrPhone?: string[]
    password?: string[]
    _form?: string[]
  }
  success?: boolean
}

type RegisterFormState = {
  errors?: {
    email?: string[]
    password?: string[]
    confirmPassword?: string[]
    fullName?: string[]
    phone?: string[]
    idCardNumber?: string[]
    dateOfBirth?: string[]
    gender?: string[]
    occupation?: string[]
    address?: string[]
    tenantId?: string[]
    referralCode?: string[]
    _form?: string[]
  }
  success?: boolean
}

// Login Action
export async function loginAction(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  try {
    // Parse form data
    const rawData = {
      emailOrPhone: formData.get('emailOrPhone') as string,
      password: formData.get('password') as string,
    }

    // Validate data
    const validatedData = loginSchema.parse(rawData)

    // Create Supabase client
    const supabase = await createServerClient()

    // Attempt login
    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.emailOrPhone,
      password: validatedData.password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return {
          errors: {
            _form: ['Email/password salah atau akun tidak ditemukan'],
          },
        }
      }
      
      if (error.message.includes('Email not confirmed')) {
        return {
          errors: {
            _form: ['Email belum dikonfirmasi. Silakan cek email Anda'],
          },
        }
      }

      return {
        errors: {
          _form: [error.message],
        },
      }
    }

    // Revalidate and redirect
    revalidatePath('/')
    return { success: true }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        errors: error.flatten().fieldErrors,
      }
    }

    return {
      errors: {
        _form: ['Terjadi kesalahan yang tidak terduga'],
      },
    }
  }
}

// Register Action
export async function registerAction(
  prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  try {
    // Parse form data
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
      idCardNumber: formData.get('idCardNumber') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      gender: formData.get('gender') as string,
      occupation: formData.get('occupation') as string || undefined,
      address: formData.get('address') as string,
      tenantId: formData.get('tenantId') as string,
      referralCode: formData.get('referralCode') as string || undefined,
    }

    // Debug: log received form data
    console.log('=== FORM DATA DEBUG ===')
    console.log('Raw form data:', Object.fromEntries(formData.entries()))
    console.log('Parsed data:', rawData)
    console.log('========================')

    // Validate data
    const validatedData = registerSchema.parse(rawData)

    // Manual password confirmation check
    if (validatedData.password !== validatedData.confirmPassword) {
      return {
        errors: {
          confirmPassword: ['Password dan konfirmasi password tidak cocok'],
        },
      }
    }

    // Create Supabase client
    const supabase = await createServerClient()

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('members')
      .select('email')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      return {
        errors: {
          email: ['Email sudah terdaftar'],
        },
      }
    }

    // Check if phone already exists
    const { data: existingPhone } = await supabase
      .from('members')
      .select('phone')
      .eq('phone', validatedData.phone)
      .single()

    if (existingPhone) {
      return {
        errors: {
          phone: ['Nomor HP sudah terdaftar'],
        },
      }
    }

    // Check if ID card number already exists
    const { data: existingIdCard } = await supabase
      .from('members')
      .select('id_card_number')
      .eq('id_card_number', validatedData.idCardNumber)
      .single()

    if (existingIdCard) {
      return {
        errors: {
          idCardNumber: ['Nomor KTP sudah terdaftar'],
        },
      }
    }

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          full_name: validatedData.fullName,
          phone: validatedData.phone,
        },
      },
    })

    if (authError) {
      return {
        errors: {
          _form: [authError.message],
        },
      }
    }

    if (!authData.user) {
      return {
        errors: {
          _form: ['Gagal membuat akun'],
        },
      }
    }

    // Get tenant info for member number generation
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('tenant_code')
      .eq('id', validatedData.tenantId)
      .single()

    if (tenantError || !tenantData) {
      return {
        errors: {
          tenantId: ['Koperasi tidak ditemukan'],
        },
      }
    }

    // Generate member number
    const year = new Date().getFullYear()
    const memberNumber = `${tenantData.tenant_code}-${year}-00001` // Simplified for now

    // Create member record
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        id: authData.user.id,
        tenant_id: validatedData.tenantId,
        member_number: memberNumber,
        full_name: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone,
        id_card_number: validatedData.idCardNumber,
        date_of_birth: validatedData.dateOfBirth,
        gender: validatedData.gender,
        occupation: validatedData.occupation,
        address: validatedData.address,
        referral_code: validatedData.referralCode,
        status: 'active',
      })

    if (memberError) {
      // If member creation fails, should cleanup auth user
      console.error('Member creation failed:', memberError)
      return {
        errors: {
          _form: ['Gagal membuat profil anggota'],
        },
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return {
        errors: error.flatten().fieldErrors,
      }
    }

    return {
      errors: {
        _form: ['Terjadi kesalahan yang tidak terduga'],
      },
    }
  }
}

// Logout Action
export async function logoutAction() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}

// Helper function to get available tenants
export async function getAvailableTenants() {
  try {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('tenants')
      .select('id, tenant_name, tenant_code, tenant_type')
      .eq('is_active', true)
      .order('tenant_name')

    if (error) {
      console.error('Error fetching tenants:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Unexpected error fetching tenants:', error)
    return []
  }
}