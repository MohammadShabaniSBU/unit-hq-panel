import type { ApiEmployeeRow } from '~/types/rbac'

export function useEmployeeList() {
  const { get } = useApi()
  const searchQuery = ref('')

  const { data, pending, error, refresh } = useAsyncData(
    'rbac-employees',
    () => get<Array<ApiEmployeeRow>>('/api/employees')
  )

  const employees = computed(() => {
    const items = data.value?.data ?? []
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) {
      return items
    }
    return items.filter(row =>
      row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
    )
  })

  return {
    searchQuery,
    employees,
    pending,
    error,
    refresh
  }
}
