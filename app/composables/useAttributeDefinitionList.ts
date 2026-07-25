import type {
  ApiAttributeDefinition,
  AttributeDefinitionStatus,
  AttributeEntityType
} from '~/types/attribute'

function matchesSearch(definition: ApiAttributeDefinition, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [definition.label, definition.key, definition.group_name ?? '']
    .some(value => value.toLowerCase().includes(normalized))
}

export function useAttributeDefinitionList() {
  const { get } = useApi()
  const searchQuery = ref('')
  const entityTypeFilter = ref<AttributeEntityType>('contact')
  const statusFilter = ref<AttributeDefinitionStatus>('active')

  const { data, pending, error, refresh } = useAsyncData(
    'attribute-definitions',
    () => get<Array<ApiAttributeDefinition>>(
      '/api/attribute-definitions',
      {
        entity_type: entityTypeFilter.value,
        status: statusFilter.value
      }
    ),
    { watch: [entityTypeFilter, statusFilter] }
  )

  const definitions = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(definition => matchesSearch(definition, searchQuery.value))
  })

  return {
    searchQuery,
    entityTypeFilter,
    statusFilter,
    definitions,
    pending,
    error,
    refresh
  }
}
