import type { NavigationMenuItem } from '@nuxt/ui'
import { navigationSections, settingsNavigation } from '~/config/navigation'

function isNavActive(to: string | undefined, path: string) {
  if (!to) {
    return false
  }

  return path === to || path.startsWith(`${to}/`)
}

const pinnedLinkUi = {
  link: 'px-3 py-1.5 rounded-md before:!inset-0 before:rounded-md text-brand-100 normal-case tracking-normal text-sm',
  linkLabel: 'text-brand-100',
  linkLeadingIcon: 'size-[18px] text-brand-300',
  linkTrailingBadge: 'rounded-full'
} as const

export function useAppNavigation() {
  const route = useRoute()
  const { t } = useI18n()

  const navigation = computed<Array<NavigationMenuItem>>(() =>
    navigationSections.flatMap((section) => {
      if (section.collapsible === false) {
        return [
          {
            label: t(section.labelKey),
            type: 'label' as const
          },
          ...section.items.map(item => ({
            ...item,
            label: t(item.labelKey),
            active: isNavActive(typeof item.to === 'string' ? item.to : undefined, route.path),
            ui: pinnedLinkUi
          }))
        ] satisfies Array<NavigationMenuItem>
      }

      return [{
        label: t(section.labelKey),
        defaultOpen: section.items.some(item => isNavActive(String(item.to), route.path)),
        children: section.items.map(item => ({
          ...item,
          label: t(item.labelKey),
          active: isNavActive(typeof item.to === 'string' ? item.to : undefined, route.path)
        }))
      } satisfies NavigationMenuItem]
    })
  )

  const settingsItem = computed(() => ({
    ...settingsNavigation,
    label: t(settingsNavigation.labelKey),
    active: route.path.startsWith('/settings')
  }))

  return { navigation, settingsItem }
}
