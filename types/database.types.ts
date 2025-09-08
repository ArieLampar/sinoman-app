// TypeScript types untuk Supabase Database - Koperasi Sinoman SuperApp
// Generated berdasarkan database schema documentation

// Enums untuk status dan kategori
export type MemberStatus = 'active' | 'inactive' | 'suspended'
export type MemberRole = 'member' | 'pengurus' | 'admin' | 'super_admin'
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'shu'
export type SavingsType = 'pokok' | 'wajib' | 'sukarela'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'savings_transfer'
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type TenantType = 'kecamatan' | 'desa' | 'pusat'
export type Gender = 'L' | 'P' // L = Laki-laki, P = Perempuan

// Core Tables Interfaces

export interface Tenant {
  id: string
  tenant_code: string
  tenant_name: string
  tenant_type: TenantType
  address?: string
  phone?: string
  email?: string
  is_active: boolean
  settings?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  tenant_id: string
  member_number: string
  full_name: string
  email?: string
  phone?: string
  id_card_number: string
  date_of_birth?: string
  gender?: Gender
  occupation?: string
  address?: string
  rt?: string
  rw?: string
  village?: string
  district?: string
  photo_url?: string
  join_date?: string
  referral_code?: string
  referred_by?: string
  status: MemberStatus
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  tenant_id: string
  username: string
  email: string
  password_hash: string
  full_name: string
  role: string
  permissions?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

// Savings Module

export interface SavingsAccount {
  id: string
  member_id: string
  tenant_id: string
  account_number: string
  pokok_balance: number
  wajib_balance: number
  sukarela_balance: number
  total_balance: number
  last_transaction_date?: string
  created_at: string
  updated_at: string
}

export interface SavingsTransaction {
  id: string
  member_id: string
  tenant_id: string
  transaction_code: string
  transaction_type: TransactionType
  savings_type: SavingsType
  amount: number
  balance_before: number
  balance_after: number
  description?: string
  payment_method: PaymentMethod
  verified_by?: string
  created_by: string
  transaction_date: string
  created_at: string
}

// E-Commerce Module

export interface ProductCategory {
  id: string
  category_name: string
  description?: string
  icon_url?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  tenant_id: string
  sku: string
  product_name: string
  category_id: string
  unit: string
  cost_price: number
  member_price: number
  public_price: number
  stock_quantity: number
  nutritional_info?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  member_id: string
  tenant_id: string
  order_date: string
  subtotal: number
  total_amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  order_status: OrderStatus
  processed_by?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
}

// Fit Challenge Module

export interface FitChallenge {
  id: string
  tenant_id: string
  challenge_code: string
  challenge_name: string
  batch_number: number
  start_date: string
  end_date: string
  registration_fee: number
  max_participants: number
  current_participants: number
  trainer_name?: string
  status: string
  created_at: string
  updated_at: string
}

export interface FitParticipant {
  id: string
  member_id: string
  challenge_id: string
  registration_number: string
  payment_status: PaymentStatus
  initial_weight?: number
  current_weight?: number
  target_weight?: number
  attendance_count: number
  total_sessions: number
  status: string
  created_at: string
  updated_at: string
}

export interface FitProgressWeekly {
  id: string
  participant_id: string
  week_number: number
  measurement_date: string
  weight?: number
  body_fat_percentage?: number
  muscle_mass?: number
  trainer_notes?: string
  created_at: string
}

// Waste Bank Module

export interface WasteCategory {
  id: string
  category_code: string
  category_name: string
  sub_category?: string
  buying_price_per_kg: number
  selling_price_per_kg: number
  minimum_weight_kg: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CollectionPoint {
  id: string
  tenant_id: string
  point_code: string
  point_name: string
  address: string
  rt?: string
  rw?: string
  latitude?: number
  longitude?: number
  storage_capacity_kg: number
  current_load_kg: number
  has_maggot_facility: boolean
  last_collection_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WasteTransaction {
  id: string
  transaction_number: string
  member_id: string
  tenant_id: string
  collection_point_id: string
  transaction_date: string
  total_weight_kg: number
  total_value: number
  admin_fee: number
  net_value: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  savings_transaction_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface WasteTransactionDetail {
  id: string
  transaction_id: string
  waste_category_id: string
  weight_kg: number
  price_per_kg: number
  subtotal: number
  condition_quality?: string
  created_at: string
}

export interface WasteBalance {
  id: string
  member_id: string
  tenant_id: string
  organic_balance: number
  inorganic_balance: number
  total_balance: number
  total_weight_collected_kg: number
  total_earnings: number
  current_balance: number
  total_transferred: number
  last_transaction_date?: string
  last_updated: string
}

// Route Management

export interface Vehicle {
  id: string
  tenant_id: string
  vehicle_code: string
  vehicle_type: string
  vehicle_name: string
  plate_number: string
  capacity_kg: number
  fuel_type: string
  driver_name?: string
  status: string
  last_maintenance_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CollectionRoute {
  id: string
  route_code: string
  route_name: string
  route_date: string
  vehicle_id: string
  driver_name: string
  start_time?: string
  end_time?: string
  total_distance_km?: number
  total_weight_collected_kg?: number
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

// Financial Module

export interface SHUCalculation {
  id: string
  tenant_id: string
  year: number
  total_revenue: number
  total_expenses: number
  gross_profit: number
  shu_amount: number
  member_distribution_percentage: number
  reserve_percentage: number
  management_percentage: number
  calculation_date: string
  approval_date?: string
  approved_by?: string
  status: string
  created_at: string
  updated_at: string
}

export interface SHUDistribution {
  id: string
  shu_calculation_id: string
  member_id: string
  savings_points: number
  transaction_points: number
  total_points: number
  shu_amount: number
  distribution_date: string
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  savings_transaction_id?: string
  created_at: string
}

export interface FinancialReport {
  id: string
  tenant_id: string
  report_type: string
  report_period: string
  savings_revenue: number
  waste_revenue: number
  product_revenue: number
  fitness_revenue: number
  other_revenue: number
  total_revenue: number
  operational_expenses: number
  fuel_expenses: number
  maintenance_expenses: number
  salary_expenses: number
  other_expenses: number
  total_expenses: number
  net_profit: number
  report_date: string
  generated_by: string
  status: string
  created_at: string
  updated_at: string
}

// System Tables

export interface Notification {
  id: string
  recipient_id: string
  recipient_type: string
  title: string
  message: string
  type: NotificationType
  category: string
  action_url?: string
  data?: Record<string, any>
  is_read: boolean
  read_at?: string
  sent_via?: string
  created_at: string
}

export interface Setting {
  id: string
  tenant_id?: string
  setting_key: string
  setting_value: Record<string, any>
  description?: string
  is_public: boolean
  updated_by: string
  updated_at: string
  created_at: string
}

export interface AuditLog {
  id: string
  tenant_id?: string
  user_id?: string
  user_type: string
  action: string
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Database interface untuk Supabase client
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: Tenant
        Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tenant, 'id' | 'created_at'>>
      }
      members: {
        Row: Member
        Insert: Omit<Member, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Member, 'id' | 'created_at'>>
      }
      admin_users: {
        Row: AdminUser
        Insert: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AdminUser, 'id' | 'created_at'>>
      }
      savings_accounts: {
        Row: SavingsAccount
        Insert: Omit<SavingsAccount, 'id' | 'created_at' | 'updated_at' | 'total_balance'>
        Update: Partial<Omit<SavingsAccount, 'id' | 'created_at' | 'total_balance'>>
      }
      savings_transactions: {
        Row: SavingsTransaction
        Insert: Omit<SavingsTransaction, 'id' | 'created_at' | 'transaction_code'>
        Update: Partial<Omit<SavingsTransaction, 'id' | 'created_at' | 'transaction_code'>>
      }
      transactions: {
        Row: SavingsTransaction
        Insert: Omit<SavingsTransaction, 'id' | 'created_at' | 'transaction_code'>
        Update: Partial<Omit<SavingsTransaction, 'id' | 'created_at' | 'transaction_code'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      product_categories: {
        Row: ProductCategory
        Insert: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProductCategory, 'id' | 'created_at'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_number'>
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'order_number'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id' | 'created_at'>
        Update: Partial<Omit<OrderItem, 'id' | 'created_at'>>
      }
      fit_challenges: {
        Row: FitChallenge
        Insert: Omit<FitChallenge, 'id' | 'created_at' | 'updated_at' | 'challenge_code'>
        Update: Partial<Omit<FitChallenge, 'id' | 'created_at' | 'challenge_code'>>
      }
      fit_participants: {
        Row: FitParticipant
        Insert: Omit<FitParticipant, 'id' | 'created_at' | 'updated_at' | 'registration_number'>
        Update: Partial<Omit<FitParticipant, 'id' | 'created_at' | 'registration_number'>>
      }
      fit_progress_weekly: {
        Row: FitProgressWeekly
        Insert: Omit<FitProgressWeekly, 'id' | 'created_at'>
        Update: Partial<Omit<FitProgressWeekly, 'id' | 'created_at'>>
      }
      waste_categories: {
        Row: WasteCategory
        Insert: Omit<WasteCategory, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<WasteCategory, 'id' | 'created_at'>>
      }
      collection_points: {
        Row: CollectionPoint
        Insert: Omit<CollectionPoint, 'id' | 'created_at' | 'updated_at' | 'point_code'>
        Update: Partial<Omit<CollectionPoint, 'id' | 'created_at' | 'point_code'>>
      }
      waste_transactions: {
        Row: WasteTransaction
        Insert: Omit<WasteTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>
        Update: Partial<Omit<WasteTransaction, 'id' | 'created_at' | 'transaction_number'>>
      }
      waste_transaction_details: {
        Row: WasteTransactionDetail
        Insert: Omit<WasteTransactionDetail, 'id' | 'created_at'>
        Update: Partial<Omit<WasteTransactionDetail, 'id' | 'created_at'>>
      }
      waste_balances: {
        Row: WasteBalance
        Insert: Omit<WasteBalance, 'id' | 'last_updated'>
        Update: Partial<Omit<WasteBalance, 'id'>>
      }
      vehicles: {
        Row: Vehicle
        Insert: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'vehicle_code'>
        Update: Partial<Omit<Vehicle, 'id' | 'created_at' | 'vehicle_code'>>
      }
      collection_routes: {
        Row: CollectionRoute
        Insert: Omit<CollectionRoute, 'id' | 'created_at' | 'updated_at' | 'route_code'>
        Update: Partial<Omit<CollectionRoute, 'id' | 'created_at' | 'route_code'>>
      }
      shu_calculations: {
        Row: SHUCalculation
        Insert: Omit<SHUCalculation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SHUCalculation, 'id' | 'created_at'>>
      }
      shu_distributions: {
        Row: SHUDistribution
        Insert: Omit<SHUDistribution, 'id' | 'created_at'>
        Update: Partial<Omit<SHUDistribution, 'id' | 'created_at'>>
      }
      financial_reports: {
        Row: FinancialReport
        Insert: Omit<FinancialReport, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FinancialReport, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      settings: {
        Row: Setting
        Insert: Omit<Setting, 'id' | 'created_at'>
        Update: Partial<Omit<Setting, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      member_status: MemberStatus
      member_role: MemberRole
      transaction_type: TransactionType
      savings_type: SavingsType
      payment_method: PaymentMethod
      order_status: OrderStatus
      payment_status: PaymentStatus
      notification_type: NotificationType
      tenant_type: TenantType
      gender: Gender
    }
  }
}