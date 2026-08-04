import { settingsNavGroups } from '~/config/settingsNavigation'
import { Permission } from '~/types/permissions'

const RBAC_PATHS = new Set(['/settings/people', '/settings/roles'])

export function useSettingsNavigation() {
  const route = useRoute()
  const { t } = useI18n()
  const { can } = usePermissions()

  const groups = computed(() =>
    settingsNavGroups
      .map(group => ({
        label: t(group.labelKey),
        items: group.items
          .filter((item) => {
            if (RBAC_PATHS.has(item.to) || item.to.startsWith('/settings/roles/')) {
              return can(Permission.RbacManage)
            }
            return true
          })
          .map(item => ({
            label: t(item.labelKey),
            icon: item.icon,
            to: item.to,
            active: route.path === item.to || route.path.startsWith(`${item.to}/`)
          }))
      }))
      .filter(group => group.items.length > 0)
  )

  return { groups }
}
