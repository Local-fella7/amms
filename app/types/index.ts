// Core domain TypeScript interfaces for AMMS

export interface User {
  id: number | string
  name: string
  email?: string
}

export interface Location {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

export interface AgeGroup {
  id: number
  name: string
  from_age?: number | string
  to_age?: number | string
  created_at?: string
  updated_at?: string
}

export interface Member {
  id: number
  first_name: string
  last_name: string
  gender: 'male' | 'female' | string
  fathers_name?: string
  mothers_name?: string
  location_id: number | string
  picture?: string
  photo?: string
  photo_url?: string
  avatar?: string
  email?: string
  date_of_birth: string
  member_status: 'active' | 'inactive' | 'deceased' | string
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | string
  phone: string
  fee_exemption: 'yes' | 'no' | string
  age_group_id: number | string
  registration_date: string
  location?: Location
  age_group?: AgeGroup
  created_at?: string
  updated_at?: string
}

export interface Fee {
  id: number
  year?: number
  fee_year?: number
  amount?: number
  name?: string
  created_at?: string
  updated_at?: string
}

export interface PaymentMode {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

export interface FeePayment {
  id: number
  date: string
  payment_mode_id: number | string
  amount: number
  fee_id: number | string
  member_id: number | string
  total_paid?: number
  outstanding?: number
  fee_amount?: number
  member?: Partial<Member>
  fee?: Fee
  payment_mode?: PaymentMode
  created_at?: string
  updated_at?: string
}

export interface NotificationItem {
  id: number
  name: string
  content?: string
  notification_template_id?: number | string
  created_at?: string
  updated_at?: string
}

export interface NotificationTemplate {
  id: number
  name: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface NotificationMember {
  id: number
  notification_id: number | string
  member_id: number | string
  notification?: NotificationItem
  member?: Partial<Member>
  created_at?: string
  updated_at?: string
}

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  errors?: Record<string, string[]>
}
