import type { ApiAttributeDefinition, AttributeEntityType } from '~/types/attribute'

export type CreateAttributeValue = string | number | boolean | Array<number> | null

export interface CreateAttributePayloadItem {
  definition_id: number
  value: CreateAttributeValue
}

function emptyValueFor(type: ApiAttributeDefinition['type']): CreateAttributeValue {
  if (type === 'multiselect') {
    return []
  }

  // Booleans always have a definite value; false satisfies required.
  if (type === 'boolean') {
    return false
  }

  return null
}

function isEmpty(definition: ApiAttributeDefinition, value: CreateAttributeValue): boolean {
  if (definition.type === 'boolean') {
    return value !== true && value !== false
  }

  if (definition.type === 'multiselect') {
    return !Array.isArray(value) || value.length === 0
  }

  if (definition.type === 'number' || definition.type === 'select') {
    return value === null || value === undefined || value === ''
  }

  return value === null || value === undefined || String(value).trim() === ''
}

export function useRequiredCreateAttributes(
  entityType: MaybeRefOrGetter<AttributeEntityType>
) {
  const { get } = useApi()
  const { t } = useI18n()
  const entityTypeRef = computed(() => toValue(entityType))

  const { data, pending, error, refresh } = useAsyncData(
    () => `required-create-attrs-${entityTypeRef.value}`,
    () => get<Array<ApiAttributeDefinition>>(
      `/api/${entityTypeRef.value}/attribute-definitions`,
      { required: 1 }
    ),
    { watch: [entityTypeRef] }
  )

  const definitions = computed(() => data.value?.data ?? [])
  const values = reactive<Record<number, CreateAttributeValue>>({})
  const fieldErrors = ref<Record<number, string>>({})

  function syncDefaults(defs: Array<ApiAttributeDefinition>) {
    const activeIds = new Set(defs.map(definition => definition.id))

    for (const key of Object.keys(values)) {
      const id = Number(key)
      if (!activeIds.has(id)) {
        delete values[id]
      }
    }

    for (const definition of defs) {
      if (!(definition.id in values)) {
        values[definition.id] = emptyValueFor(definition.type)
      }
    }
  }

  watch(definitions, (defs) => {
    syncDefaults(defs)
  }, { immediate: true })

  function validate(): boolean {
    const errors: Record<number, string> = {}

    for (const definition of definitions.value) {
      if (isEmpty(definition, values[definition.id] ?? null)) {
        errors[definition.id] = t('forms.attributes.requiredError')
      }
    }

    fieldErrors.value = errors

    return Object.keys(errors).length === 0
  }

  function toPayload(): Array<CreateAttributePayloadItem> {
    return definitions.value.map(definition => ({
      definition_id: definition.id,
      value: values[definition.id] ?? emptyValueFor(definition.type)
    }))
  }

  function reset() {
    fieldErrors.value = {}
    for (const key of Object.keys(values)) {
      delete values[Number(key)]
    }
    syncDefaults(definitions.value)
  }

  function applyServerErrors(errors: Record<string, Array<string>>) {
    const next: Record<number, string> = { ...fieldErrors.value }

    for (const [key, messages] of Object.entries(errors)) {
      const match = /^attributes\.(\d+)/.exec(key)
      if (!match) {
        continue
      }

      next[Number(match[1])] = messages[0] ?? t('forms.attributes.requiredError')
    }

    fieldErrors.value = next
  }

  return {
    definitions,
    pending,
    error,
    values,
    fieldErrors,
    validate,
    toPayload,
    reset,
    applyServerErrors,
    refresh
  }
}
