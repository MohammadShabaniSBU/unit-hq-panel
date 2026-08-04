import type { Permission, PermissionValue } from '~/types/permissions'

export function usePermissions() {
  const auth = useAuthStore()

  const permissionMap = computed(() => {
    const map = new Map<string, Array<number> | null>()
    for (const grant of auth.employee?.permissions ?? []) {
      map.set(grant.permission, grant.site_ids)
    }
    return map
  })

  const isCompanyWide = computed(() => {
    for (const siteIds of permissionMap.value.values()) {
      if (siteIds === null) {
        return true
      }
    }
    return false
  })

  const grantedSiteIds = computed<Array<number> | null>(() => {
    if (isCompanyWide.value) {
      return null
    }

    const ids = new Set<number>()
    for (const siteIds of permissionMap.value.values()) {
      if (siteIds === null) {
        return null
      }
      for (const id of siteIds) {
        ids.add(id)
      }
    }
    return Array.from(ids).sort((a, b) => a - b)
  })

  function can(permission: Permission | PermissionValue): boolean {
    return permissionMap.value.has(String(permission))
  }

  function canAtSite(permission: Permission | PermissionValue, siteId: number): boolean {
    const siteIds = permissionMap.value.get(String(permission))
    if (siteIds === undefined) {
      return false
    }
    if (siteIds === null) {
      return true
    }
    return siteIds.includes(siteId)
  }

  function canAny(permissions: Array<Permission | PermissionValue>): boolean {
    return permissions.some(permission => can(permission))
  }

  return {
    can,
    canAtSite,
    canAny,
    grantedSiteIds,
    isCompanyWide
  }
}
