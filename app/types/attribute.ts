export const ATTRIBUTE_ENTITY_TYPES = [
  'contact',
  'deal',
  'offer',
  'reservation',
  'unit',
  'contract'
] as const

export type AttributeEntityType = (typeof ATTRIBUTE_ENTITY_TYPES)[number]

export const ATTRIBUTE_TYPES = [
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect'
] as const

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number]

export interface ApiAttributeOption {
  id: number
  definition_id: number
  label: string
  display_order: number
}

export type AttributeDefinitionStatus = 'active' | 'archived' | 'all'

export interface ApiAttributeDefinition {
  id: number
  entity_type: AttributeEntityType
  key: string
  label: string
  type: AttributeType
  group_name: string | null
  display_order: number
  is_required: boolean
  is_promoted: boolean
  usage_count: number
  promoted_column: string | null
  archived_at: string | null
  options: Array<ApiAttributeOption>
  created_at: string
  updated_at: string
}

export function attributeTypeRequiresOptions(type: AttributeType): boolean {
  return type === 'select' || type === 'multiselect'
}
