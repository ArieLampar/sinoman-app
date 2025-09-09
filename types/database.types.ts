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

// Fit Challenge specific types
export type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type ParticipantStatus = 'registered' | 'active' | 'completed' | 'dropped' | 'suspended'
export type AchievementLevel = 'bronze' | 'silver' | 'gold' | 'platinum'
export type WorkoutType = 'cardio' | 'strength' | 'yoga' | 'mixed'
export type AchievementType = 'weight_loss' | 'attendance' | 'consistency' | 'improvement'

// E-Commerce specific types
export type ProductType = 'protein' | 'vegetable' | 'grain' | 'dairy' | 'meat' | 'seafood' | 'beverage' | 'snack' | 'processed' | 'organic' | 'local_specialty'
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock' | 'discontinued' | 'coming_soon'
export type EnhancedOrderStatus = 'pending' | 'confirmed' | 'prepared' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded'
export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned'
export type CartStatus = 'active' | 'abandoned' | 'converted' | 'expired'
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping'
export type MovementType = 'in' | 'out' | 'adjustment' | 'transfer' | 'damaged' | 'expired'

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

// Fit Challenge Module - Enhanced

export interface FitChallenge {
  id: string
  tenant_id: string
  challenge_code: string
  challenge_name: string
  description?: string
  batch_number: number
  start_date: string
  end_date: string
  registration_deadline: string
  registration_fee: number
  max_participants: number
  current_participants: number
  trainer_name?: string
  trainer_phone?: string
  trainer_photo_url?: string
  location?: string
  schedule_days?: string
  schedule_time?: string
  requirements?: string
  prizes_info?: Record<string, any>
  rules_regulation?: string
  status: ChallengeStatus
  featured: boolean
  photo_url?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface FitParticipant {
  id: string
  member_id: string
  challenge_id: string
  registration_number: string
  registration_date: string
  payment_status: PaymentStatus
  payment_method?: string
  payment_reference?: string
  payment_date?: string
  
  // Initial measurements
  initial_weight?: number
  initial_height?: number
  initial_body_fat?: number
  initial_muscle_mass?: number
  initial_photo_url?: string
  initial_notes?: string
  
  // Current measurements
  current_weight?: number
  current_body_fat?: number
  current_muscle_mass?: number
  current_photo_url?: string
  
  // Target measurements
  target_weight?: number
  target_body_fat?: number
  target_muscle_mass?: number
  
  // Progress tracking
  attendance_count: number
  total_sessions: number
  attendance_percentage: number
  
  // Status and completion
  status: ParticipantStatus
  completion_date?: string
  final_score?: number
  achievement_level?: AchievementLevel
  certificates_url?: string
  
  // Additional info
  health_conditions?: string
  emergency_contact?: string
  emergency_phone?: string
  motivation_notes?: string
  
  created_at: string
  updated_at: string
}

export interface FitProgressWeekly {
  id: string
  participant_id: string
  week_number: number
  measurement_date: string
  
  // Body measurements
  weight?: number
  body_fat_percentage?: number
  muscle_mass?: number
  waist_circumference?: number
  chest_circumference?: number
  arm_circumference?: number
  
  // Progress photos
  front_photo_url?: string
  side_photo_url?: string
  back_photo_url?: string
  
  // Performance metrics
  cardio_endurance_score?: number
  strength_score?: number
  flexibility_score?: number
  
  // Weekly goals and achievements
  weekly_goal?: string
  weekly_achievement?: string
  challenges_faced?: string
  
  // Trainer assessment
  trainer_notes?: string
  trainer_rating?: number
  improvement_areas?: string
  next_week_focus?: string
  
  // Attendance for the week
  sessions_attended: number
  sessions_scheduled: number
  
  created_at: string
  updated_at: string
}

export interface FitActivityDaily {
  id: string
  participant_id: string
  activity_date: string
  
  // Exercise activities
  workout_completed: boolean
  workout_type?: WorkoutType
  workout_duration?: number
  calories_burned?: number
  exercise_notes?: string
  
  // Nutrition tracking
  meals_logged: boolean
  water_intake_liters?: number
  protein_intake_grams?: number
  calories_consumed?: number
  nutrition_notes?: string
  
  // Sleep and recovery
  sleep_hours?: number
  sleep_quality?: number
  stress_level?: number
  energy_level?: number
  
  // Daily mood and motivation
  mood_rating?: number
  motivation_level?: number
  daily_reflection?: string
  
  // Progress photos
  progress_photo_url?: string
  
  created_at: string
  updated_at: string
}

export interface FitLeaderboard {
  id: string
  challenge_id: string
  participant_id: string
  
  // Scoring categories
  weight_loss_score: number
  body_fat_reduction_score: number
  muscle_gain_score: number
  attendance_score: number
  consistency_score: number
  improvement_score: number
  
  // Total and ranking
  total_score: number
  current_rank?: number
  previous_rank?: number
  best_rank?: number
  
  // Achievement badges
  badges?: Record<string, any>
  
  // Last update
  last_calculated: string
  created_at: string
}

export interface FitAchievement {
  id: string
  challenge_id: string
  participant_id: string
  
  achievement_type: AchievementType
  achievement_name: string
  achievement_description?: string
  badge_icon?: string
  
  criteria_met?: Record<string, any>
  achievement_date: string
  points_awarded: number
  
  created_at: string
}

// E-Commerce Module - Enhanced

export interface EnhancedProductCategory {
  id: string
  tenant_id: string
  category_code: string
  category_name: string
  parent_category_id?: string
  description?: string
  icon_url?: string
  banner_image_url?: string
  sort_order: number
  is_active: boolean
  is_featured: boolean
  seo_title?: string
  seo_description?: string
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  tenant_id: string
  supplier_code: string
  supplier_name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  postal_code?: string
  business_license?: string
  tax_number?: string
  bank_account?: string
  payment_terms?: string
  product_categories?: string[]
  specialty_products?: string
  rating: number
  total_orders: number
  on_time_delivery_rate: number
  quality_score: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EnhancedProduct {
  id: string
  tenant_id: string
  category_id: string
  supplier_id?: string
  
  // Product Identity
  sku: string
  barcode?: string
  product_name: string
  product_slug: string
  product_type: ProductType
  brand_name?: string
  
  // Product Details
  description?: string
  short_description?: string
  specifications?: Record<string, any>
  nutritional_info?: Record<string, any>
  ingredients?: string
  allergen_info?: string
  storage_instructions?: string
  usage_instructions?: string
  
  // Pricing
  cost_price: number
  member_price: number
  public_price: number
  bulk_price?: number
  bulk_min_quantity?: number
  
  // Inventory
  unit: string
  weight_grams?: number
  dimensions?: Record<string, any>
  stock_quantity: number
  min_stock_level: number
  max_stock_level: number
  
  // Images and Media
  primary_image_url?: string
  gallery_images?: Record<string, any>
  video_url?: string
  
  // Product Attributes
  expiry_date?: string
  manufacturing_date?: string
  shelf_life_days?: number
  is_organic: boolean
  is_local_product: boolean
  is_halal_certified: boolean
  certification_info?: Record<string, any>
  
  // Status and Visibility
  status: ProductStatus
  is_featured: boolean
  is_new_arrival: boolean
  is_best_seller: boolean
  is_on_sale: boolean
  sale_start_date?: string
  sale_end_date?: string
  
  // SEO and Marketing
  seo_title?: string
  seo_description?: string
  meta_keywords?: string
  tags?: string[]
  
  // Analytics
  view_count: number
  order_count: number
  rating_average: number
  review_count: number
  
  created_by: string
  created_at: string
  updated_at: string
}

export interface ShoppingCart {
  id: string
  member_id: string
  session_id?: string
  
  status: CartStatus
  total_items: number
  total_weight_grams: number
  subtotal: number
  
  // Applied Discounts
  discount_code?: string
  discount_amount: number
  member_discount_amount: number
  
  // Delivery Info
  delivery_date?: string
  delivery_time_slot?: string
  delivery_address_id?: string
  delivery_notes?: string
  
  expires_at: string
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  product_id: string
  
  quantity: number
  unit_price: number
  total_price: number
  
  // Product snapshot
  product_name: string
  product_image_url?: string
  product_sku: string
  
  // Special requests
  special_instructions?: string
  gift_wrap: boolean
  gift_message?: string
  
  added_at: string
  updated_at: string
}

export interface MemberAddress {
  id: string
  member_id: string
  
  address_label: string
  recipient_name: string
  phone?: string
  
  address_line_1: string
  address_line_2?: string
  city: string
  district?: string
  postal_code?: string
  
  // Location coordinates
  latitude?: number
  longitude?: number
  
  // Delivery instructions
  delivery_instructions?: string
  access_code?: string
  
  is_default: boolean
  is_active: boolean
  
  created_at: string
  updated_at: string
}

export interface OrderDelivery {
  id: string
  order_id: string
  
  // Driver/Delivery Person
  driver_id?: string
  driver_name?: string
  driver_phone?: string
  vehicle_info?: string
  
  // Delivery Status
  status: DeliveryStatus
  estimated_delivery?: string
  actual_pickup_time?: string
  actual_delivery_time?: string
  
  // Tracking Info
  tracking_number?: string
  current_location?: Record<string, any>
  route_updates?: Record<string, any>[]
  
  // Delivery Proof
  delivery_photo_url?: string
  signature_url?: string
  recipient_name?: string
  delivery_notes?: string
  
  // Performance Metrics
  distance_km?: number
  delivery_time_minutes?: number
  customer_rating?: number
  customer_feedback?: string
  
  created_at: string
  updated_at: string
}

export interface DeliveryDriver {
  id: string
  tenant_id: string
  
  driver_code: string
  full_name: string
  phone: string
  email?: string
  
  // Vehicle Info
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_capacity_kg?: number
  
  // License and Documents
  license_number?: string
  license_expiry?: string
  insurance_info?: string
  
  // Performance Metrics
  total_deliveries: number
  successful_deliveries: number
  average_rating: number
  on_time_delivery_rate: number
  
  // Status
  is_active: boolean
  is_available: boolean
  current_location?: Record<string, any>
  
  created_at: string
  updated_at: string
}

export interface ProductReview {
  id: string
  product_id: string
  member_id: string
  order_id?: string
  
  rating: number
  title?: string
  review_text?: string
  
  // Review Categories
  quality_rating?: number
  value_rating?: number
  delivery_rating?: number
  
  // Media
  review_images?: Record<string, any>
  
  // Verification
  is_verified_purchase: boolean
  is_approved: boolean
  moderation_notes?: string
  
  // Helpfulness
  helpful_count: number
  total_votes: number
  
  created_at: string
  updated_at: string
}

export interface DiscountCoupon {
  id: string
  tenant_id: string
  
  coupon_code: string
  coupon_name: string
  description?: string
  
  // Discount Details
  discount_type: DiscountType
  discount_value: number
  minimum_order_amount: number
  maximum_discount_amount?: number
  
  // Usage Limits
  usage_limit?: number
  usage_limit_per_customer: number
  current_usage: number
  
  // Validity
  valid_from: string
  valid_until: string
  
  // Conditions
  applicable_categories?: string[]
  applicable_products?: string[]
  member_types?: string[]
  
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  product_id: string
  
  movement_type: MovementType
  quantity: number
  unit_cost?: number
  
  // Reference
  reference_type?: string
  reference_id?: string
  
  // Details
  reason?: string
  batch_number?: string
  expiry_date?: string
  supplier_id?: string
  
  // Stock levels after movement
  stock_before: number
  stock_after: number
  
  created_by: string
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
      enhanced_product_categories: {
        Row: EnhancedProductCategory
        Insert: Omit<EnhancedProductCategory, 'id' | 'created_at' | 'updated_at' | 'category_code'>
        Update: Partial<Omit<EnhancedProductCategory, 'id' | 'created_at' | 'category_code'>>
      }
      suppliers: {
        Row: Supplier
        Insert: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'supplier_code'>
        Update: Partial<Omit<Supplier, 'id' | 'created_at' | 'supplier_code'>>
      }
      enhanced_products: {
        Row: EnhancedProduct
        Insert: Omit<EnhancedProduct, 'id' | 'created_at' | 'updated_at' | 'sku' | 'product_slug'>
        Update: Partial<Omit<EnhancedProduct, 'id' | 'created_at' | 'sku'>>
      }
      shopping_carts: {
        Row: ShoppingCart
        Insert: Omit<ShoppingCart, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ShoppingCart, 'id' | 'created_at'>>
      }
      cart_items: {
        Row: CartItem
        Insert: Omit<CartItem, 'id' | 'added_at' | 'updated_at'>
        Update: Partial<Omit<CartItem, 'id' | 'added_at'>>
      }
      member_addresses: {
        Row: MemberAddress
        Insert: Omit<MemberAddress, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MemberAddress, 'id' | 'created_at'>>
      }
      order_deliveries: {
        Row: OrderDelivery
        Insert: Omit<OrderDelivery, 'id' | 'created_at' | 'updated_at' | 'tracking_number'>
        Update: Partial<Omit<OrderDelivery, 'id' | 'created_at' | 'tracking_number'>>
      }
      delivery_drivers: {
        Row: DeliveryDriver
        Insert: Omit<DeliveryDriver, 'id' | 'created_at' | 'updated_at' | 'driver_code'>
        Update: Partial<Omit<DeliveryDriver, 'id' | 'created_at' | 'driver_code'>>
      }
      product_reviews: {
        Row: ProductReview
        Insert: Omit<ProductReview, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProductReview, 'id' | 'created_at'>>
      }
      discount_coupons: {
        Row: DiscountCoupon
        Insert: Omit<DiscountCoupon, 'id' | 'created_at' | 'updated_at' | 'current_usage'>
        Update: Partial<Omit<DiscountCoupon, 'id' | 'created_at' | 'coupon_code'>>
      }
      inventory_movements: {
        Row: InventoryMovement
        Insert: Omit<InventoryMovement, 'id' | 'created_at'>
        Update: Partial<Omit<InventoryMovement, 'id' | 'created_at'>>
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
      fit_activities_daily: {
        Row: FitActivityDaily
        Insert: Omit<FitActivityDaily, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FitActivityDaily, 'id' | 'created_at'>>
      }
      fit_leaderboard: {
        Row: FitLeaderboard
        Insert: Omit<FitLeaderboard, 'id' | 'created_at' | 'last_calculated'>
        Update: Partial<Omit<FitLeaderboard, 'id' | 'created_at'>>
      }
      fit_achievements: {
        Row: FitAchievement
        Insert: Omit<FitAchievement, 'id' | 'created_at' | 'achievement_date'>
        Update: Partial<Omit<FitAchievement, 'id' | 'created_at'>>
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
      challenge_status: ChallengeStatus
      participant_status: ParticipantStatus
      achievement_level: AchievementLevel
      workout_type: WorkoutType
      achievement_type: AchievementType
    }
  }
}