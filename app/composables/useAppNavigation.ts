import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavItem } from '~/config/navigation'
import { navigationSections, settingsNavigation } from '~/config/navigation'
import { Permission } from '~/types/permissions'

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

function applyInboxBadge(
  item: NavigationMenuItem,
  unread: number,
  triage: number
): NavigationMenuItem {
  if (item.to !== '/inbox') {
    return item
  }

  if (unread > 0) {
    return {
      ...item,
      badge: {
        label: String(unread),
        color: triage > 0 ? 'warning' : 'primary',
        size: 'sm'
      }
    }
  }

  if (triage > 0) {
    return {
      ...item,
      badge: {
        label: '·',
        color: 'warning',
        size: 'sm'
      }
    }
  }

  const { badge: _badge, ...rest } = item
  return rest
}

const pinnedLinkUi = {
  link: 'px-3 py-1.5 rounded-md before:!inset-0 before:rounded-md text-brand-100 normal-case tracking-normal text-sm',
  linkLabel: 'text-brand-100',
  linkLeadingIcon: 'size-[18px] text-brand-300',
  linkTrailingBadge: 'rounded-full'
} as const

const SETTINGS_PERMISSIONS: Array<Permission> = [
  Permission.SettingsManage,
  Permission.RbacManage,
  Permission.BillingSettingsManage,
  Permission.CredentialManage,
  Permission.LegalEntityManage,
  Permission.TaxRateManage,
  Permission.SiteManage
]

function filterNavItems(
  items: Array<NavItem>,
  can: (permission: Permission) => boolean
): Array<NavItem> {
  const result: Array<NavItem> = []

  for (const item of items) {
    if (item.permission && !can(item.permission)) {
      continue
    }

    const children = item.children ? filterNavItems(item.children, can) : undefined
    if (children && children.length === 0 && !item.to) {
      continue
    }

    result.push({ ...item, children })
  }

  return result
}

export function useAppNavigation() {
  const route = useRoute()
  const { t } = useI18n()
  const { unreadThreads, triageCount } = useInboxBadge()
  const { can, canAny } = usePermissions()

  const navigation = computed(() => {
    const items: Array<NavigationMenuItem> = []

    for (const section of navigationSections) {
      const sectionItems = filterNavItems(section.items, can)
      if (sectionItems.length === 0) {
        continue
      }

      if (section.collapsible === false) {
        items.push({
          label: t(section.labelKey),
          type: 'label'
        })
        for (const item of sectionItems) {
          items.push({
            ...applyInboxBadge(
              mapNavItem(item, route.path, t),
              unreadThreads.value,
              triageCount.value
            ),
            ui: pinnedLinkUi
          })
        }
        continue
      }

      items.push({
        label: t(section.labelKey),
        defaultOpen: sectionItems.some(item => itemOrDescendantActive(item, route.path)),
        children: sectionItems.map(item =>
          applyInboxBadge(mapNavItem(item, route.path, t), unreadThreads.value, triageCount.value)
        )
      })
    }

    return items
  })

  const canAccessSettings = computed(() => canAny(SETTINGS_PERMISSIONS))

  const settingsItem = computed(() => ({
    labelKey: settingsNavigation.labelKey,
    label: t(settingsNavigation.labelKey),
    icon: settingsNavigation.icon,
    to: settingsNavigation.to as string,
    active: route.path.startsWith('/settings'),
    visible: canAccessSettings.value
  }))

  return { navigation, settingsItem, canAccessSettings }
}
