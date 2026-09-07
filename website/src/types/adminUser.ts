export interface AdminUserOverview {
  user_id: string
  public_user_id: string | null
  email: string | null
  display_name: string | null
  tiktok_username: string | null
  role: string
  created_at: string
  deleted_at: string | null
  plan: string | null
  status: string | null
  trial_total: number | null
  trial_used: number | null
  trial_eligible: boolean | null
  blocked_at: string | null
  blocked_reason: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  payment_provider: string | null
  last_payment_status: string | null
  active_device_count: number
  videos_generated: number
  last_generation_at: string | null
  last_device_seen_at: string | null
  lifetime_revenue_cents: number
  has_active_grant: boolean
}
