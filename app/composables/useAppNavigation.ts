import type { NavigationMenuItem } from '@nuxt/ui'
import { navigationSections, settingsNavigation } from '~/config/navigation'

function isNavActive(to: string | undefined, path: string) {
  if (!to) {
    return false
  }

  return path === to || path.startsWith(`${to}/`)
}

export function useAppNavigation() {
  const route = useRoute()
  const { t } = useI18n()

  const navigation = computed<Array<NavigationMenuItem>>(() =>
    navigationSections.map(section => ({
      label: t(section.labelKey),
      defaultOpen: section.items.some(item => isNavActive(String(item.to), route.path)),
      children: section.items.map(item => ({
        ...item,
        label: t(item.labelKey),
        active: isNavActive(typeof item.to === 'string' ? item.to : undefined, route.path)
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
