export type WhatsappTemplateStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revoked'
  | 'archived'

export type WhatsappTemplateCategory = 'utility' | 'marketing' | 'authentication'

export interface WhatsappTemplateVariable {
  index: number
  label: string
  token_default: string | null
  sample: string | null
}

export interface WhatsappTemplateButton {
  type: 'url' | 'quick_reply'
  text: string
  url?: string | null
}

export interface ApiWhatsappTemplate {
  id: number
  name: string
  language: string
  category: WhatsappTemplateCategory
  header_text: string | null
  body: string
  footer_text: string | null
  buttons: Array<WhatsappTemplateButton> | null
  variables: Array<WhatsappTemplateVariable>
  status: WhatsappTemplateStatus
  rejection_reason: string | null
  provider_template_id: string | null
  submitted_at: string | null
  decided_at: string | null
  communication_account_id: number
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface WhatsappTemplateGroup {
  name: string
  templates: Array<ApiWhatsappTemplate>
}

export interface WhatsappTemplatePayload {
  name: string
  language: string
  category: WhatsappTemplateCategory
  header_text: string | null
  body: string
  footer_text: string | null
  buttons: Array<WhatsappTemplateButton> | null
  variables: Array<WhatsappTemplateVariable>
}

const PLACEHOLDER_RE = /\{\{(\d+)\}\}/g

export function extractPlaceholderIndexes(body: string): Array<number> {
  const indexes = new Set<number>()
  for (const match of body.matchAll(PLACEHOLDER_RE)) {
    indexes.add(Number(match[1]))
  }
  return Array.from(indexes).sort((a, b) => a - b)
}

export function syncVariablesFromBody(
  body: string,
  existing: Array<WhatsappTemplateVariable>
): Array<WhatsappTemplateVariable> {
  const byIndex = new Map(existing.map(v => [v.index, v]))
  return extractPlaceholderIndexes(body).map((index) => {
    const prev = byIndex.get(index)
    return {
      index,
      label: prev?.label ?? '',
      token_default: prev?.token_default ?? null,
      sample: prev?.sample ?? null
    }
  })
}

export function substituteSamples(
  text: string,
  variables: Array<WhatsappTemplateVariable>
): string {
  let result = text
  for (const variable of variables) {
    const sample = variable.sample?.trim() || `{{${variable.index}}}`
    result = result.replaceAll(`{{${variable.index}}}`, sample)
  }
  return result
}

export function groupTemplatesByName(rows: Array<ApiWhatsappTemplate>): Array<WhatsappTemplateGroup> {
  const map = new Map<string, Array<ApiWhatsappTemplate>>()
  for (const row of rows) {
    const list = map.get(row.name) ?? []
    list.push(row)
    map.set(row.name, list)
  }
  return Array.from(map.entries()).map(([name, templates]) => ({
    name,
    templates: templates.sort((a, b) => a.language.localeCompare(b.language))
  }))
}
