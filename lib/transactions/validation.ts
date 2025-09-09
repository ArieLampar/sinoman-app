// lib/transactions/validation.ts
// Validation utilities for transaction features

import { SavingsAccount } from '@/types/database.types'

export interface TransactionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface TransactionInput {
  type: 'deposit' | 'withdrawal' | 'transfer'
  savingsType: 'pokok' | 'wajib' | 'sukarela'
  amount: number
  currentBalance: number
  totalBalance: number
  transferToMemberId?: string
}

/**
 * Validates a savings transaction before processing
 */
export function validateTransaction(input: TransactionInput): TransactionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic amount validation
  if (input.amount <= 0) {
    errors.push('Jumlah transaksi harus lebih dari 0')
  }

  if (input.amount > 1000000000) { // 1 billion IDR limit
    errors.push('Jumlah transaksi terlalu besar')
  }

  // Withdrawal specific validations
  if (input.type === 'withdrawal') {
    if (input.savingsType === 'pokok') {
      errors.push('Simpanan pokok tidak dapat ditarik')
    }

    if (input.amount > input.currentBalance) {
      errors.push(`Saldo ${input.savingsType} tidak mencukupi. Saldo tersedia: ${formatCurrency(input.currentBalance)}`)
    }

    // Warning for large withdrawal
    if (input.amount > input.currentBalance * 0.8) {
      warnings.push('Penarikan ini akan mengurangi saldo hingga 80% atau lebih')
    }
  }

  // Transfer specific validations
  if (input.type === 'transfer') {
    if (!input.transferToMemberId) {
      errors.push('Anggota tujuan transfer harus dipilih')
    }

    if (input.amount > input.currentBalance) {
      errors.push(`Saldo ${input.savingsType} tidak mencukupi untuk transfer. Saldo tersedia: ${formatCurrency(input.currentBalance)}`)
    }

    // Minimum transfer amount
    if (input.amount < 10000) {
      errors.push('Jumlah transfer minimal Rp 10.000')
    }
  }

  // Deposit validations
  if (input.type === 'deposit') {
    // Minimum deposit amounts
    const minimumDeposits = {
      pokok: 25000,    // Minimum Rp 25,000 for mandatory savings
      wajib: 10000,    // Minimum Rp 10,000 for compulsory savings
      sukarela: 5000   // Minimum Rp 5,000 for voluntary savings
    }

    if (input.amount < minimumDeposits[input.savingsType]) {
      errors.push(`Setoran minimum ${input.savingsType} adalah ${formatCurrency(minimumDeposits[input.savingsType])}`)
    }

    // Warning for large deposit
    if (input.amount > 50000000) { // 50 million IDR
      warnings.push('Setoran dalam jumlah besar, pastikan data sudah benar')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates savings account balance consistency
 */
export function validateAccountBalance(account: SavingsAccount): TransactionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  const calculatedTotal = account.pokok_balance + account.wajib_balance + account.sukarela_balance

  if (Math.abs(calculatedTotal - account.total_balance) > 0.01) {
    errors.push('Inkonsistensi saldo: total saldo tidak sesuai dengan penjumlahan komponen')
  }

  if (account.pokok_balance < 0 || account.wajib_balance < 0 || account.sukarela_balance < 0) {
    errors.push('Saldo simpanan tidak boleh negatif')
  }

  // Warnings for unusual balances
  if (account.pokok_balance === 0) {
    warnings.push('Simpanan pokok belum ada')
  }

  if (account.wajib_balance < account.pokok_balance) {
    warnings.push('Simpanan wajib lebih kecil dari simpanan pokok')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Calculates new balance after transaction
 */
export function calculateNewBalance(
  currentBalance: number, 
  amount: number, 
  transactionType: 'deposit' | 'withdrawal' | 'transfer'
): number {
  switch (transactionType) {
    case 'deposit':
      return currentBalance + amount
    case 'withdrawal':
    case 'transfer':
      return currentBalance - amount
    default:
      return currentBalance
  }
}

/**
 * Calculates total balance from individual savings components
 */
export function calculateTotalBalance(
  pokokBalance: number,
  wajibBalance: number,
  sukarelaBalance: number
): number {
  return pokokBalance + wajibBalance + sukarelaBalance
}

/**
 * Validates transaction limits based on member tier or status
 */
export function validateTransactionLimits(
  amount: number,
  transactionType: 'deposit' | 'withdrawal' | 'transfer',
  memberTier: 'basic' | 'premium' | 'gold' = 'basic'
): TransactionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Daily transaction limits based on member tier
  const dailyLimits = {
    basic: {
      deposit: 10000000,    // 10 million IDR
      withdrawal: 2000000,  // 2 million IDR
      transfer: 1000000     // 1 million IDR
    },
    premium: {
      deposit: 25000000,    // 25 million IDR
      withdrawal: 5000000,  // 5 million IDR
      transfer: 2500000     // 2.5 million IDR
    },
    gold: {
      deposit: 100000000,   // 100 million IDR
      withdrawal: 20000000, // 20 million IDR
      transfer: 10000000    // 10 million IDR
    }
  }

  const limit = dailyLimits[memberTier][transactionType]

  if (amount > limit) {
    errors.push(`Jumlah ${transactionType} melebihi batas harian ${memberTier}: ${formatCurrency(limit)}`)
  }

  // Warning at 80% of limit
  if (amount > limit * 0.8) {
    warnings.push(`Transaksi mendekati batas harian: ${formatCurrency(limit)}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Formats currency for display in validation messages
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

/**
 * Validates transaction code format
 */
export function validateTransactionCode(code: string): boolean {
  // Format: TRX-YYYYMMDD-XXXX
  const pattern = /^TRX-\d{8}-\d{4}$/
  return pattern.test(code)
}

/**
 * Generates unique transaction code
 */
export function generateTransactionCode(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TRX-${year}${month}${day}-${random}`
}

/**
 * Validates account number format
 */
export function validateAccountNumber(accountNumber: string): boolean {
  // Format: SAV-YYYYMM-XXXX
  const pattern = /^SAV-\d{6}-\d{4}$/
  return pattern.test(accountNumber)
}

/**
 * Generates unique account number
 */
export function generateAccountNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `SAV-${year}${month}-${random}`
}