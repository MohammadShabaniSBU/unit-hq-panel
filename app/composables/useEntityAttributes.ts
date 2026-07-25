import type { AttributeEntityType } from '~/types/attribute'
import type { ApiAttributeValue } from '~/types/layout'

export function useEntityAttributes(
  entityType: MaybeRefOrGetter<AttributeEntityType>,
  entityId: MaybeRefOrGetter<string | number | null | undefined>
) {
  const { get, patch } = useApi()
  const { t } = useI18n()

  const entityTypeRef = computed(() => toValue(entityType))
  const entityIdRef = computed(() => {
    const id = toValue(entityId)
    return id == null || id === '' ? null : String(id)
  })

  const updatingDefinitionId = ref<number | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  const { data, pending, error, refresh } = useAsyncData(
    () => `entity-attributes-${entityTypeRef.value}-${entityIdRef.value ?? 'none'}`,
    async () => {
      if (!entityIdRef.value) {
        return { message: '', data: [] as Array<ApiAttributeValue> }
      }

      return get<Array<ApiAttributeValue>>(
        `/api/${entityTypeRef.value}/${entityIdRef.value}/attribute-values`
      )
    },
    { watch: [entityTypeRef, entityIdRef] }
  )

  const values = computed(() => data.value?.data ?? [])

  const valuesByDefinitionId = computed(() => {
    const map = new Map<number, ApiAttributeValue>()
    for (const value of values.value) {
      map.set(value.definition_id, value)
    }
    return map
  })

  function mergeValue(next: ApiAttributeValue | null, definitionId: number) {
    const current = [...values.value]
    const index = current.findIndex(item => item.definition_id === definitionId)

    if (next == null) {
      if (index >= 0) {
        current.splice(index, 1)
      }
    } else if (index >= 0) {
      current[index] = next
    } else {
      current.push(next)
    }

    if (data.value) {
      data.value = { ...data.value, data: current }
    }
  }

  async function upsert(
    definitionId: number,
    value: string | number | boolean | Array<number> | null
  ) {
    if (!entityIdRef.value) {
      return null
    }

    updatingDefinitionId.value = definitionId
    const key = String(definitionId)
    const { [key]: _, ...rest } = fieldErrors.value
    fieldErrors.value = rest

    try {
      const response = await patch<ApiAttributeValue | null>('/api/attribute-values', {
        entity_type: entityTypeRef.value,
        entity_id: Number(entityIdRef.value),
        definition_id: definitionId,
        value
      })

      mergeValue(response.data ?? null, definitionId)
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = {
        ...fieldErrors.value,
        [key]: fetchError.data?.errors?.value?.[0]
          ?? fetchError.data?.message
          ?? t('forms.attributeDefinition.editErrorMessage')
      }
      return null
    } finally {
      updatingDefinitionId.value = null
    }
  }

  return {
    values,
    valuesByDefinitionId,
    pending,
    error,
    refresh,
    upsert,
    updatingDefinitionId,
    fieldErrors
  }
}
