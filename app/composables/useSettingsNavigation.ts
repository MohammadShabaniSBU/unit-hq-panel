import { settingsNavGroups } from '~/config/settingsNavigation'
import type { SettingsNavItem } from '~/config/settingsNavigation'

function itemIsActive(path: string, to: string): boolean {
  return path === to || path.startsWith(`${to}/`)
}

export function useSettingsNavigation() {
  const route = useRoute()
  const { t } = useI18n()
  const { can, canAny } = usePermissions()

  function isVisible(item: SettingsNavItem): boolean {
    if (!item.permission) {
      return true
    }

    if (Array.isArray(item.permission)) {
      return canAny(item.permission)
    }

    return can(item.permission)
  }

  const groups = computed(() =>
    settingsNavGroups
      .map(group => ({
        key: group.key,
        label: t(group.labelKey),
        icon: group.icon,
        items: group.items
          .filter(isVisible)
          .map(item => ({
            key: item.key,
            label: t(item.labelKey),
            icon: item.icon,
            to: item.to,
            active: itemIsActive(route.path, item.to)
          }))
      }))
      .filter(group => group.items.length > 0)
  )

  const activeItem = computed(() => {
    const matches: Array<{ key: string, label: string, icon: string, to: string, sectionLabel: string, sectionKey: string }> = []

    for (const group of groups.value) {
      for (const item of group.items) {
        if (itemIsActive(route.path, item.to)) {
          matches.push({
            key: item.key,
            label: item.label,
            icon: item.icon,
            to: item.to,
            sectionLabel: group.label,
            sectionKey: group.key
          })
        }
      }
    }

    return matches.sort((a, b) => b.to.length - a.to.length)[0] ?? null
  })

  return { groups, activeItem }
}
