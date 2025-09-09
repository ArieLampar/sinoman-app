// Type definitions untuk Supabase Database
// File ini berisi semua tipe data yang akan digunakan dalam aplikasi Koperasi Sinoman

// Interface untuk tabel Users - menyimpan data anggota koperasi
export interface User {
  id: string
  email: string
  full_name: string
  phone: string
  address?: string
  member_number: string
  join_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Interface untuk tabel Savings - menyimpan data simpanan anggota
export interface Savings {
  id: string
  user_id: string
  type: 'pokok' | 'wajib' | 'sukarela'
  amount: number
  description?: string
  transaction_date: string
  created_at: string
}

// Interface untuk tabel Loans - menyimpan data pinjaman anggota
export interface Loan {
  id: string
  user_id: string
  amount: number
  interest_rate: number
  duration_months: number
  monthly_payment: number
  remaining_balance: number
  status: 'active' | 'completed' | 'overdue'
  loan_date: string
  due_date: string
  created_at: string
}

// Interface untuk tabel Transactions - menyimpan semua transaksi
export interface Transaction {
  id: string
  user_id: string
  type: 'savings' | 'loan_payment' | 'loan_disbursement' | 'withdrawal'
  amount: number
  description?: string
  reference_id?: string // ID referensi ke tabel lain (savings_id, loan_id, etc)
  transaction_date: string
  created_at: string
}

// Interface untuk tabel Products - menyimpan data produk toko
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock_quantity: number
  category: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Interface untuk tabel Orders - menyimpan data pesanan
export interface Order {
  id: string
  user_id: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address: string
  order_date: string
  created_at: string
}

// Interface untuk tabel Order Items - menyimpan detail item pesanan
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
}

// Main Database interface yang menggabungkan semua tabel
// Interface ini akan digunakan oleh Supabase client untuk type safety
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      savings: {
        Row: Savings
        Insert: Omit<Savings, 'id' | 'created_at'>
        Update: Partial<Omit<Savings, 'id' | 'created_at'>>
      }
      loans: {
        Row: Loan
        Insert: Omit<Loan, 'id' | 'created_at'>
        Update: Partial<Omit<Loan, 'id' | 'created_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at'>
        Update: Partial<Omit<Order, 'id' | 'created_at'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id'>
        Update: Partial<Omit<OrderItem, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}