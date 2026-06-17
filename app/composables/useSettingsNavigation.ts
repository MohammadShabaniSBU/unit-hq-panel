import { settingsNavGroups } from '~/config/settingsNavigation'

export function useSettingsNavigation() {
  const route = useRoute()
  const { t } = useI18n()

  const groups = computed(() =>
    settingsNavGroups.map(group => ({
      label: t(group.labelKey),
      items: group.items.map(item => ({
        label: t(item.labelKey),
        icon: item.icon,
        to: item.to,
        active: route.path === item.to
      }))
    }))
  )

  return { groups }
}
