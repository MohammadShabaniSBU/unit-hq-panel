import type { AttributeEntityType } from '~/types/attribute'
import type { ApiObjectCustomization } from '~/types/layout'

export function useEntityLayout(entityType: MaybeRefOrGetter<AttributeEntityType>) {
  const { get } = useApi()
  const entityTypeRef = computed(() => toValue(entityType))

  const { data, pending, error, refresh } = useAsyncData(
    () => `entity-layout-${entityTypeRef.value}`,
    () => get<ApiObjectCustomization>(
      `/api/settings/object-customization/${entityTypeRef.value}`
    ),
    { watch: [entityTypeRef] }
  )

  const groups = computed(() => data.value?.data?.groups ?? [])

  return {
    groups,
    pending,
    error,
    refresh
  }
}
