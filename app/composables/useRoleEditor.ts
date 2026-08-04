import type { ApiPermissionsGrouped, ApiRole, RoleScopeLevel } from '~/types/rbac'
import type { PermissionValue } from '~/types/permissions'

export function useRoleEditor() {
  const { get, post, patch } = useApi()

  const { data: permissionsData, pending: permissionsPending } = useAsyncData(
    'rbac-permissions-grouped',
    () => get<ApiPermissionsGrouped>('/api/permissions')
  )

  const groupedPermissions = computed(() => permissionsData.value?.data ?? {})

  async function fetchRole(id: number): Promise<ApiRole | null> {
    const response = await get<Array<ApiRole>>('/api/roles', { status: 'all' })
    return response.data.find(role => role.id === id) ?? null
  }

  async function fetchSystemRoles(): Promise<Array<ApiRole>> {
    const response = await get<Array<ApiRole>>('/api/roles', { status: 'active' })
    return response.data.filter(role => role.is_system)
  }

  async function createRole(payload: {
    key: string
    label: string
    description?: string | null
    scope_level: RoleScopeLevel
    permissions: Array<PermissionValue>
  }) {
    return post<ApiRole>('/api/roles', payload)
  }

  async function updateRole(id: number, payload: {
    label?: string
    description?: string | null
    permissions?: Array<PermissionValue>
  }) {
    return patch<ApiRole>(`/api/roles/${id}`, payload)
  }

  async function archiveRole(id: number) {
    return post<ApiRole>(`/api/roles/${id}/archive`, {})
  }

  async function unarchiveRole(id: number) {
    return post<ApiRole>(`/api/roles/${id}/unarchive`, {})
  }

  return {
    groupedPermissions,
    permissionsPending,
    fetchRole,
    fetchSystemRoles,
    createRole,
    updateRole,
    archiveRole,
    unarchiveRole
  }
}
