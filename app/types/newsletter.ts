export interface NewsletterList {
  id: number
  key: string
  kind: string
  labels: Record<string, string>
  channels: Array<string>
  member_counts: Record<string, number>
}

export interface NewsletterIssueCounts {
  pending: number
  claimed: number
  sent: number
  skipped: number
  failed: number
}

export interface NewsletterIssue {
  id: number
  name: string
  status: string
  newsletter_issue_number: number | null
  sent_at: string | null
  scheduled_at: string | null
  counts: NewsletterIssueCounts
}
