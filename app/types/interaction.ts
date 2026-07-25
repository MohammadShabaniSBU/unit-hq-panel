export type InteractionChannel = 'email' | 'sms' | 'whatsapp' | 'call' | 'other'
export type InteractionDirection = 'inbound' | 'outbound'

export interface ApiInteraction {
  id: number
  contact_id: number
  deal_id: number | null
  channel: InteractionChannel
  direction: InteractionDirection
  occurred_at: string
  content: string | null
  summary: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface InteractionCreatedPayload {
  id: number
  contact_id: number
  deal_id: number | null
  channel: InteractionChannel
  direction: InteractionDirection
  occurred_at: string | null
  summary: string | null
  content: string | null
}

export interface CreateInteractionPayload {
  channel: InteractionChannel
  direction: InteractionDirection
  occurred_at?: string
  content?: string
  summary?: string
  deal_id?: number
  metadata?: Record<string, unknown>
}
