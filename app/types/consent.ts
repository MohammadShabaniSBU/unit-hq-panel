export interface ConsentListRef {
  id: number
  key: string | null
}

export interface ConsentStateRow {
  list: ConsentListRef
  channel: string
  action: string
  occurred_at: string
  source: string
}

export interface ConsentHistoryRow {
  id: number
  list: ConsentListRef
  channel: string
  action: string
  source: string
  consent_text_id: number | null
  occurred_at: string
  note: string | null
}

export interface ConsentListOption {
  id: number
  key: string
  labels: Record<string, string>
  channels: Array<string>
}

export interface ConsentTextOption {
  id: number
  key: string
  version: number
  locale: string
  body: string
  created_at: string
}

export interface ContactConsentsPayload {
  state: Array<ConsentStateRow>
  history: Array<ConsentHistoryRow>
  lists: Array<ConsentListOption>
}
