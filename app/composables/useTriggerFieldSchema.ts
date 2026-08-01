import type { FilterSchemaField } from '~/types/filter'
import { isBillingTriggerType, isFilterEntityType } from '~/types/trigger'

const CRM_ENTITY_PATH: Record<string, string> = {
  contact: 'contacts',
  deal: 'deals',
  offer: 'offers',
  reservation: 'reservations',
  unit: 'units',
  contract: 'contracts'
}

/**
 * Field whitelist for automation trigger configs.
 * Billing morphs → /automations/trigger-fields/{type}
 * CRM entities → existing /{resource}/filters/schema
 */
export function useTriggerFieldSchema(objectType: MaybeRefOrGetter<string>) {
  const { get } = useApi()

  const resolvedType = computed(() => toValue(objectType))

  const { data, pending, error, refresh } = useAsyncData(
    () => `trigger-field-schema:${resolvedType.value}`,
    async () => {
      const type = resolvedType.value
      if (!type) {
        return [] as Array<FilterSchemaField>
      }

      if (isBillingTriggerType(type)) {
        const response = await get<Array<FilterSchemaField>>(`/api/automations/trigger-fields/${type}`)
        return response.data
      }

      if (isFilterEntityType(type)) {
        const path = CRM_ENTITY_PATH[type]
        const response = await get<Array<FilterSchemaField>>(`/api/${path}/filters/schema`)
        return response.data
      }

      return [] as Array<FilterSchemaField>
    },
    { watch: [resolvedType] }
  )

  const fields = computed(() => data.value ?? [])

  function fieldByKey(key: string): FilterSchemaField | undefined {
    return fields.value.find(field => field.key === key)
  }

  return {
    fields,
    pending,
    error,
    refresh,
    fieldByKey
  }
}
