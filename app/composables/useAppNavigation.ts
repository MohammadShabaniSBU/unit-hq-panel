import type { NavigationMenuItem } from '@nuxt/ui'
import { navigationGroups, settingsNavigation } from '~/config/navigation'

function isNavActive(to: string | undefined, path: string) {
  if (!to) {
    return false
  }

  return path === to || path.startsWith(`${to}/`)
}

export function useAppNavigation() {
  const route = useRoute()
  const { t } = useI18n()

  const navigation = computed(() =>
    navigationGroups.map(group => ({
      label: t(group.labelKey),
      icon: group.icon,
      defaultOpen: group.items.some(item => isNavActive(String(item.to), route.path)),
      children: group.items.map(item => ({
        ...item,
        label: t(item.labelKey)
      }))
    } satisfies NavigationMenuItem))
  )

  const settingsItem = computed(() => ({
    ...settingsNavigation,
    label: t(settingsNavigation.labelKey),
    active: route.path.startsWith('/settings')
  }))

  return { navigation, settingsItem }
}
