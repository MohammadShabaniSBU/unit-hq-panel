import type { FilterEntityType, FilterSchemaField } from '~/types/filter'

const ENTITY_PATH: Record<FilterEntityType, string> = {
  contact: 'contacts',
  deal: 'deals',
  offer: 'offers',
  reservation: 'reservations',
  unit: 'units',
  contract: 'contracts'
}

export function useFilterSchema(entityType: MaybeRefOrGetter<FilterEntityType>) {
  const { get } = useApi()

  const path = computed(() => ENTITY_PATH[toValue(entityType)])

  const { data, pending, error, refresh } = useAsyncData(
    () => `filter-schema:${path.value}`,
    async () => {
      const response = await get<Array<FilterSchemaField>>(`/api/${path.value}/filters/schema`)
      return response.data
    },
    { watch: [path] }
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
    fieldByKey,
    entityPath: path
  }
}
