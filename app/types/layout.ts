import type { ApiAttributeDefinition, AttributeEntityType, AttributeType } from '~/types/attribute'

export type LayoutFieldType = 'native' | 'attribute'

export type NativeFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'email'

export interface ApiNativeFieldMeta {
  key: string
  label: string
  type: NativeFieldType
  editable: boolean
  required: boolean
  options_source: string | null
}

export interface ApiLayoutField {
  id: number
  group_id: number
  entity_type: AttributeEntityType
  display_order: number
  field_type: LayoutFieldType
  native_field_key: string | null
  attribute_definition_id: number | null
  native: ApiNativeFieldMeta | null
  attribute_definition?: ApiAttributeDefinition | null
  created_at: string
  updated_at: string
}

export interface ApiAttributeGroup {
  id: number
  entity_type: AttributeEntityType
  key: string
  label: string
  display_order: number
  is_system: boolean
  fields: Array<ApiLayoutField>
  created_at: string
  updated_at: string
}

export interface ApiObjectCustomization {
  entity_type: AttributeEntityType
  groups: Array<ApiAttributeGroup>
  available: {
    native: Array<ApiNativeFieldMeta>
    attributes: Array<ApiAttributeDefinition>
  }
}

export interface ApiAttributeValue {
  id: number
  definition_id: number
  entity_id: number
  value: string | number | boolean | Array<number> | null
  definition?: ApiAttributeDefinition
  created_at: string
  updated_at: string
}

export function layoutFieldLabel(field: ApiLayoutField): string {
  if (field.field_type === 'native') {
    return field.native?.label ?? field.native_field_key ?? ''
  }

  return field.attribute_definition?.label ?? `#${field.attribute_definition_id}`
}

export function layoutFieldTypeLabel(
  field: ApiLayoutField,
  translateAttributeType: (type: AttributeType) => string
): string {
  if (field.field_type === 'native') {
    return field.native?.type ?? 'text'
  }

  const type = field.attribute_definition?.type
  return type ? translateAttributeType(type) : 'attribute'
}
