import { settingsNavGroups } from '~/config/settingsNavigation'
import { Permission } from '~/types/permissions'

const RBAC_PATHS = new Set(['/settings/people', '/settings/roles'])
const INSIGHTS_PATH = '/settings/insights'
const AI_PROVIDERS_PATH = '/settings/ai-providers'
const AI_AGENTS_PATH = '/settings/ai-agents'

export function useSettingsNavigation() {
  const route = useRoute()
  const { t } = useI18n()
  const { can, canAny } = usePermissions()

  const groups = computed(() =>
    settingsNavGroups
      .map(group => ({
        label: t(group.labelKey),
        items: group.items
          .filter((item) => {
            if (RBAC_PATHS.has(item.to) || item.to.startsWith('/settings/roles/')) {
              return can(Permission.RbacManage)
            }
            if (item.to === INSIGHTS_PATH) {
              return canAny([Permission.CredentialManage, Permission.SettingsManage])
            }
            if (item.to === AI_PROVIDERS_PATH) {
              return can(Permission.CredentialManage)
            }
            if (item.to === AI_AGENTS_PATH) {
              return canAny([Permission.SettingsManage, Permission.AiAgentUse])
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
