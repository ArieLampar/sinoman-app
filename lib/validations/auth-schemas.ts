import { z } from 'zod'

// Validation schemas for authentication
export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email atau nomor HP harus diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

export const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi password harus diisi'),
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit'),
  idCardNumber: z.string().min(16, 'Nomor KTP harus 16 digit').max(16, 'Nomor KTP harus 16 digit'),
  dateOfBirth: z.string().min(1, 'Tanggal lahir harus diisi'),
  gender: z.enum(['L', 'P']),
  occupation: z.string().optional(),
  address: z.string().min(10, 'Alamat lengkap minimal 10 karakter'),
  tenantId: z.string().min(1, 'Pilih koperasi terlebih dahulu'),
  referralCode: z.string().optional(),
})