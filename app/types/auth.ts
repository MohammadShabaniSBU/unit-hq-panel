export interface AuthRoleGrant {
  key: string
  label: string
  site_id: number | null
}

export interface AuthPermissionGrant {
  permission: string
  site_ids: Array<number> | null
}

export interface AuthEmployee {
  id: number
  first_name: string
  last_name: string
  name: string
  email: string
  roles?: Array<AuthRoleGrant>
  permissions?: Array<AuthPermissionGrant>
  company_permissions?: Array<string>
}

export interface LoginResponse {
  token: string
  employee: AuthEmployee
}
