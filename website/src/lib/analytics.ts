'use client'

export type AnalyticsEvent =
  | 'page_view'
  | 'hero_cta_clicked'
  | 'signup_started'
  | 'signup_completed'
  | 'quiz_started'
  | 'quiz_question_answered'
  | 'quiz_completed'
  | 'download_clicked'
  | 'download_started'
  | 'login'
  | 'pricing_viewed'
  | 'faq_opened'

const SESSION_KEY = 'ttk_vm_session_id'

function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.sessionStorage.setItem(SESSION_KEY, created)
    return created
  } catch {
    return 'unknown'
  }
}

/**
 * Fire-and-forget event tracking against our own analytics_events table (see
 * migration 20260908000000_website_onboarding.sql) — no third-party vendor
 * required. Never blocks the UI and never throws: a failed analytics call
 * must not break signup, checkout or download.
 */
export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return

  try {
    const payload = JSON.stringify({
      eventName: event,
      sessionId: getSessionId(),
      properties
    })

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics', blob)
      return
    }

    fetch('/api/analytics', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(
      () => undefined
    )
  } catch {
    // Analytics must never break the product experience.
  }
}
