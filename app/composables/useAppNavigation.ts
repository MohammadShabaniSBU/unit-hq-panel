import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavItem } from '~/config/navigation'
import { navigationSections, settingsNavigation } from '~/config/navigation'

function isNavActive(to: string | undefined, path: string) {
  if (!to) {
    return false
  }

  return path === to || path.startsWith(`${to}/`)
}

function itemOrDescendantActive(item: NavItem, path: string): boolean {
  if (isNavActive(typeof item.to === 'string' ? item.to : undefined, path)) {
    return true
  }

  return item.children?.some(child => itemOrDescendantActive(child, path)) ?? false
}

function mapNavItem(item: NavItem, path: string, t: (key: string) => string): NavigationMenuItem {
  const children = item.children?.map(child => mapNavItem(child, path, t))

  return {
    ...item,
    label: t(item.labelKey),
    active: itemOrDescendantActive(item, path),
    defaultOpen: children?.some(child => child.active || child.defaultOpen) ?? undefined,
    children
  }
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
            ...mapNavItem(item, route.path, t),
            ui: pinnedLinkUi
          }))
        ] satisfies Array<NavigationMenuItem>
      }

      return [{
        label: t(section.labelKey),
        defaultOpen: section.items.some(item => itemOrDescendantActive(item, route.path)),
        children: section.items.map(item => mapNavItem(item, route.path, t))
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
