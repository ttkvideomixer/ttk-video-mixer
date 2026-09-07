import type { AdminUserOverview } from './adminUser'

export interface Subscription {
  id: string
  user_id: string
  provider: string
  provider_customer_id: string | null
  provider_subscription_id: string | null
  payment_type: string
  status: string
  amount_cents: number
  currency: string
  period_start: string | null
  period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface BillingEvent {
  id: string
  user_id: string
  provider: string
  provider_event: string
  provider_object_id: string | null
  status: string | null
  amount_cents: number | null
  created_at: string
  metadata: Record<string, unknown>
}

export interface AdminDevice {
  id: string
  user_id: string
  device_name: string | null
  first_seen_at: string
  last_seen_at: string
  revoked_at: string | null
}

export interface AdminNote {
  id: string
  user_id: string
  admin_id: string
  note: string
  created_at: string
  updated_at: string
}

export interface AccessGrant {
  id: string
  user_id: string
  grant_type: string
  start_at: string
  end_at: string
  granted_by: string
  reason: string
  revoked_at: string | null
  created_at: string
}

export interface FraudFlag {
  id: string
  user_id: string
  flag_type: string
  note: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  admin_user_id: string
  action_type: string
  target_user_id: string | null
  target_object_type: string | null
  reason: string | null
  previous_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface OnboardingRow {
  user_id: string
  q1: number | null
  q2: number | null
  q3: number | null
  q4: number | null
  q5: number | null
  q6: number | null
  q7: number | null
  profile_type: string | null
  score_volume: number
  score_consistency: number
  score_variation: number
  score_automation: number
  completed_at: string | null
}

export interface GenerationBatch {
  id: string
  user_id: string
  count: number
  app_version: string | null
  status: string
  created_at: string
}

export interface AdminUserDetail {
  overview: AdminUserOverview
  subscriptions: Subscription[]
  billingEvents: BillingEvent[]
  devices: AdminDevice[]
  onboarding: OnboardingRow | null
  notes: AdminNote[]
  tags: string[]
  grants: AccessGrant[]
  fraudFlags: FraudFlag[]
  auditLog: AuditLogEntry[]
  generationBatches: GenerationBatch[]
}
