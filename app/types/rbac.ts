import type { PermissionValue } from '~/types/permissions'

export type RoleScopeLevel = 'company' | 'site' | 'any'
export type RoleStatusFilter = 'active' | 'archived' | 'all'
export type EmployeeStatus = 'invited' | 'active' | 'deactivated'

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

export interface ApiEmployeeGrantInput {
  role_id: number
  site_id: number | null
}

export interface ApiEmployeeRow {
  id: number
  first_name: string
  last_name: string
  name: string
  email: string
  status: EmployeeStatus
  last_login_at: string | null
  open_invitation_id: number | null
  grants: Array<ApiEmployeeGrant>
  invite_link?: string
  email_sent?: boolean
}

export type ApiPermissionsGrouped = Record<
  string,
  Array<{ permission: PermissionValue, i18n_key: string }>
>
