import type { PermissionValue } from '~/types/permissions'

export type RoleScopeLevel = 'company' | 'site' | 'any'
export type RoleStatusFilter = 'active' | 'archived' | 'all'

export interface ApiRole {
  id: number
  key: string
  label: string
  description: string | null
  scope_level: RoleScopeLevel
  is_system: boolean
  archived_at: string | null
  permissions: Array<PermissionValue>
  permission_count: number
}

export interface ApiEmployeeGrant {
  id: number
  role_id: number
  role_key: string
  role_label: string
  scope_level: RoleScopeLevel
  site_id: number | null
  site_name: string | null
  is_company_wide: boolean
}

export interface ApiEmployeeRow {
  id: number
  name: string
  email: string
  grants: Array<ApiEmployeeGrant>
}

export type ApiPermissionsGrouped = Record<
  string,
  Array<{ permission: PermissionValue, i18n_key: string }>
>
