export type AiSummaryStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface AiSummaryHighlight {
  key: string
  label_key: string | null
  value: string
}

export interface AiSummary {
  id: number
  status: AiSummaryStatus
  body: string | null
  highlights: Array<AiSummaryHighlight> | null
  locale: string
  provider: string | null
  model: string | null
  prompt_version: string
  source_digest: string | null
  source_counts: Record<string, number> | null
  error_code: string | null
  generated_at: string | null
  created_at: string
  superseded_at: string | null
}

export interface AiSummaryResponse {
  current: AiSummary | null
  in_flight: AiSummary | null
  last_failed: AiSummary | null
  is_stale: boolean
  can_generate: boolean
}
