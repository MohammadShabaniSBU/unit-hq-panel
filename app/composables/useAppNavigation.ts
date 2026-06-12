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

  const navigation = computed(() =>
    navigationGroups.map(group => ({
      label: group.label,
      icon: group.icon,
      defaultOpen: group.items.some(item => isNavActive(String(item.to), route.path)),
      children: group.items
    } satisfies NavigationMenuItem))
  )

  return { navigation, settingsItem: settingsNavigation }
}
