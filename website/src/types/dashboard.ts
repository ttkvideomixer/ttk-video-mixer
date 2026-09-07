export interface DashboardMetrics {
  usersTotal: number
  usersNew: number
  subscribersActive: number
  subscribersPastDue: number
  subscriptionsCanceledInPeriod: number
  trialActive: number
  revenueGrossCents: number
  revenueRefundsCents: number
  revenueNetCents: number
  newSubscriptions: number
  renewalsApproved: number
  renewalsFailed: number
  renewalSuccessRatePercent: number | null
  mrrCents: number
  mrrSubscriberCount: number
  churnedSubscriptionsInPeriod: number
  churnRatePercent: number | null
  downloadsWindows: number
  downloadsMacos: number
  generationsAuthorized: number
  trialToProConversions: number
  periodFrom: string
  periodTo: string
  serverTime: string
}

export interface RevenueTimeseriesPoint {
  bucket: string
  gross: number
  refunds: number
  newSubscriptions: number
  renewals: number
  pix: number
  card: number
}

export interface DashboardResponse {
  current: DashboardMetrics
  previous: DashboardMetrics | null
  timeseries: RevenueTimeseriesPoint[]
}
