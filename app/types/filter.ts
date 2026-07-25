export type FilterFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect'

export type FilterOperator
  = | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'before'
    | 'after'
    | 'between'
    | 'contains'
    | 'in'
    | 'any_of'
    | 'all_of'
    | 'none_of'
    | 'is_empty'

export interface FilterSchemaOption {
  value: string | number | boolean
  label: string
}

export interface FilterSchemaField {
  key: string
  label: string
  type: FilterFieldType
  operators: Array<FilterOperator>
  custom?: boolean
  options?: Array<FilterSchemaOption>
}

export interface FilterCondition {
  field: string
  op: FilterOperator
  value: unknown
}

export interface FilterGroup {
  op: 'and' | 'or'
  conditions: Array<FilterCondition | FilterGroup>
}

export type FilterEntityType = 'contact' | 'deal' | 'offer' | 'reservation' | 'unit' | 'contract'

export function isFilterGroup(node: FilterCondition | FilterGroup): node is FilterGroup {
  return 'conditions' in node && Array.isArray(node.conditions)
}

export function countFilterConditions(group: FilterGroup | null | undefined): number {
  if (!group) {
    return 0
  }

  return group.conditions.reduce((sum, node) => {
    if (isFilterGroup(node)) {
      return sum + countFilterConditions(node)
    }

    return sum + 1
  }, 0)
}

export function createEmptyCondition(fieldKey = ''): FilterCondition {
  return {
    field: fieldKey,
    op: 'eq',
    value: null
  }
}

export function createEmptyGroup(op: 'and' | 'or' = 'and'): FilterGroup {
  return {
    op,
    conditions: []
  }
}

export function encodeFilterParam(filter: FilterGroup | null): string {
  if (!filter || filter.conditions.length === 0) {
    return ''
  }

  const json = JSON.stringify(filter)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeFilterParam(value: string | null | undefined): FilterGroup | null {
  if (!value) {
    return null
  }

  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (padded.length % 4)) % 4
    const base64 = padded + '='.repeat(padLength)
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as FilterGroup

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.conditions)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
