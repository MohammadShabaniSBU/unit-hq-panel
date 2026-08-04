import type { ApiRole, RoleStatusFilter } from '~/types/rbac'

export function useRoleList() {
  const { get } = useApi()
  const statusFilter = ref<RoleStatusFilter>('active')
  const searchQuery = ref('')

  const { data, pending, error, refresh } = useAsyncData(
    () => `rbac-roles-${statusFilter.value}`,
    () => get<Array<ApiRole>>('/api/roles', { status: statusFilter.value }),
    { watch: [statusFilter] }
  )

  const roles = computed(() => {
    const items = data.value?.data ?? []
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) {
      return items
    }
    return items.filter(role =>
      role.label.toLowerCase().includes(q)
      || role.key.toLowerCase().includes(q)
    )
  })

  return {
    statusFilter,
    searchQuery,
    roles,
    pending,
    error,
    refresh
  }
}
