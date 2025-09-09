'use server'

import { createServerClient } from '@/lib/supabase/server'
import { NotificationType } from '@/types/database.types'

interface CreateNotificationParams {
  recipientId: string
  recipientType?: string
  title: string
  message: string
  type?: NotificationType
  category?: string
  actionUrl?: string
  data?: Record<string, unknown>
}

export async function createNotification({
  recipientId,
  recipientType = 'member',
  title,
  message,
  type = 'info',
  category = 'general',
  actionUrl,
  data
}: CreateNotificationParams) {
  const supabase = await createServerClient()

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      recipient_type: recipientType,
      title,
      message,
      type,
      category,
      action_url: actionUrl,
      data,
      is_read: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }

  return notification
}

export async function createBulkNotifications(
  recipientIds: string[],
  params: Omit<CreateNotificationParams, 'recipientId'>
) {
  const notifications = recipientIds.map(recipientId => ({
    recipient_id: recipientId,
    recipient_type: params.recipientType || 'member',
    title: params.title,
    message: params.message,
    type: params.type || 'info',
    category: params.category || 'general',
    action_url: params.actionUrl,
    data: params.data,
    is_read: false
  }))

  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()

  if (error) {
    console.error('Error creating bulk notifications:', error)
    throw error
  }

  return data
}

// Notification triggers for specific events

export async function notifyWelcomeMember(memberId: string, memberName: string) {
  return createNotification({
    recipientId: memberId,
    title: 'Selamat Datang di Koperasi Sinoman!',
    message: `Halo ${memberName}, selamat bergabung dengan Koperasi Sinoman. Akun Anda telah aktif dan siap digunakan.`,
    type: 'success',
    category: 'member',
    actionUrl: '/profile'
  })
}

export async function notifySavingsDeposit(
  memberId: string,
  amount: number,
  savingsType: string,
  transactionCode: string
) {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount)

  return createNotification({
    recipientId: memberId,
    title: 'Setoran Berhasil',
    message: `Setoran ${savingsType} sebesar ${formattedAmount} telah berhasil. Kode transaksi: ${transactionCode}`,
    type: 'success',
    category: 'savings',
    actionUrl: '/savings',
    data: { amount, savingsType, transactionCode }
  })
}

export async function notifySavingsWithdrawal(
  memberId: string,
  amount: number,
  savingsType: string,
  transactionCode: string
) {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount)

  return createNotification({
    recipientId: memberId,
    title: 'Penarikan Berhasil',
    message: `Penarikan ${savingsType} sebesar ${formattedAmount} telah berhasil. Kode transaksi: ${transactionCode}`,
    type: 'info',
    category: 'savings',
    actionUrl: '/savings',
    data: { amount, savingsType, transactionCode }
  })
}

export async function notifyOrderStatus(
  memberId: string,
  orderNumber: string,
  status: string,
  statusText: string
) {
  const statusMessages = {
    confirmed: 'dikonfirmasi dan sedang diproses',
    shipped: 'telah dikirim',
    delivered: 'telah sampai tujuan',
    cancelled: 'dibatalkan'
  }

  return createNotification({
    recipientId: memberId,
    title: `Pesanan ${statusText}`,
    message: `Pesanan #${orderNumber} ${statusMessages[status as keyof typeof statusMessages] || status}.`,
    type: status === 'cancelled' ? 'warning' : 'info',
    category: 'order',
    actionUrl: `/orders/${orderNumber}`,
    data: { orderNumber, status }
  })
}

export async function notifyWasteTransaction(
  memberId: string,
  transactionNumber: string,
  weight: number,
  earnings: number
) {
  const formattedEarnings = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(earnings)

  return createNotification({
    recipientId: memberId,
    title: 'Transaksi Bank Sampah',
    message: `Sampah ${weight} kg berhasil ditimbang. Pendapatan: ${formattedEarnings}. Kode: ${transactionNumber}`,
    type: 'success',
    category: 'waste',
    actionUrl: '/waste',
    data: { transactionNumber, weight, earnings }
  })
}

export async function notifyFitChallengeRegistration(
  memberId: string,
  challengeName: string,
  registrationNumber: string
) {
  return createNotification({
    recipientId: memberId,
    title: 'Pendaftaran Fit Challenge Berhasil',
    message: `Anda telah terdaftar di ${challengeName}. Nomor registrasi: ${registrationNumber}`,
    type: 'success',
    category: 'fitness',
    actionUrl: '/fitness',
    data: { challengeName, registrationNumber }
  })
}

export async function notifyFitChallengeProgress(
  memberId: string,
  weekNumber: number,
  weightLost: number
) {
  return createNotification({
    recipientId: memberId,
    title: `Progress Minggu ke-${weekNumber}`,
    message: `Selamat! Anda telah menurunkan ${weightLost} kg. Tetap semangat!`,
    type: 'success',
    category: 'fitness',
    actionUrl: '/fitness/progress'
  })
}

export async function notifySHUDistribution(
  memberId: string,
  amount: number,
  year: number
) {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount)

  return createNotification({
    recipientId: memberId,
    title: 'Pembagian SHU',
    message: `SHU tahun ${year} sebesar ${formattedAmount} telah ditransfer ke simpanan Anda.`,
    type: 'success',
    category: 'shu',
    actionUrl: '/savings',
    data: { amount, year }
  })
}

export async function notifyLowStock(
  adminId: string,
  productName: string,
  currentStock: number
) {
  return createNotification({
    recipientId: adminId,
    recipientType: 'admin',
    title: 'Stok Produk Menipis',
    message: `Stok ${productName} tersisa ${currentStock} unit. Segera lakukan restok.`,
    type: 'warning',
    category: 'inventory',
    actionUrl: '/admin/products'
  })
}

export async function notifyCollectionPointFull(
  adminId: string,
  pointName: string,
  capacityPercentage: number
) {
  return createNotification({
    recipientId: adminId,
    recipientType: 'admin',
    title: 'Lokasi Pengumpulan Penuh',
    message: `${pointName} telah mencapai ${capacityPercentage}% kapasitas. Segera lakukan pengangkutan.`,
    type: capacityPercentage >= 90 ? 'error' : 'warning',
    category: 'waste',
    actionUrl: '/admin/waste/collection-points'
  })
}

export async function notifyMaintenanceDue(
  adminId: string,
  vehicleName: string,
  plateNumber: string
) {
  return createNotification({
    recipientId: adminId,
    recipientType: 'admin',
    title: 'Jadwal Maintenance Kendaraan',
    message: `${vehicleName} (${plateNumber}) sudah waktunya untuk maintenance rutin.`,
    type: 'warning',
    category: 'vehicle',
    actionUrl: '/admin/vehicles'
  })
}