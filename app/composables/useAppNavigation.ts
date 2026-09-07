import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavItem } from '~/config/navigation'
import { navigationSections, settingsNavigation } from '~/config/navigation'
import type { InsightNavItem } from '~/types/insights'
import { resolveInsightLabel } from '~/types/insights'
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

function applyPendingActionsBadge(
  item: NavigationMenuItem,
  pending: number
): NavigationMenuItem {
  if (item.to !== '/leasing/agent-approvals') {
    return item
  }

  if (pending > 0) {
    return {
      ...item,
      badge: {
        label: String(pending),
        color: 'warning',
        size: 'sm'
      }
    }
  }

  const { badge: _badge, ...rest } = item
  return rest
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
  link: 'px-3 py-1.5 rounded-md before:!inset-0 before:rounded-md text-cosmos-100 normal-case tracking-normal text-sm',
  linkLabel: 'text-cosmos-100',
  linkLeadingIcon: 'size-[18px] text-cosmos-400',
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

function connectionMuted(item: InsightNavItem): boolean {
  return item.source === 'embedded'
    && item.connection_status != null
    && item.connection_status !== 'connected'
}

function buildInsightsNavChildren(
  feed: Array<InsightNavItem>,
  path: string,
  t: (key: string) => string
): Array<NavigationMenuItem> {
  const sorted = [...feed].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  const hasSections = sorted.some(item => item.section != null && item.section !== '')

  if (!hasSections) {
    return sorted.map(item => mapInsightNavItem(item, path, t))
  }

  const children: Array<NavigationMenuItem> = []
  let lastSection: string | null = null

  for (const item of sorted) {
    const section = item.section?.trim() || ''
    if (section && section !== lastSection) {
      const sectionKey = `insights.sections.${section}`
      const translated = t(sectionKey)
      children.push({
        label: translated !== sectionKey ? translated : section,
        type: 'label'
      })
      lastSection = section
    }
    children.push(mapInsightNavItem(item, path, t))
  }

  return children
}

function mapInsightNavItem(
  item: InsightNavItem,
  path: string,
  t: (key: string) => string
): NavigationMenuItem {
  const to = `/insights/${item.key}`
  const muted = connectionMuted(item)

  return {
    label: resolveInsightLabel(item, t),
    icon: item.icon ?? 'i-lucide-chart-column',
    to,
    active: path === to || path.startsWith(`${to}/`),
    class: muted ? 'opacity-50' : undefined
  }
}

export function useAppNavigation() {
  const route = useRoute()
  const { t } = useI18n()
  const { unreadThreads, triageCount } = useInboxBadge()
  const { pendingCount } = useAgentPendingBadge()
  const { can, canAny } = usePermissions()
  const { navVisible: demoNavVisible } = useAgentsDemoAvailable()
  const {
    items: insightItems,
    ensureLoaded
  } = useInsightRegistry()

  onMounted(() => {
    void ensureLoaded()
  })

  const navigation = computed(() => {
    const items: Array<NavigationMenuItem> = []

    for (const section of navigationSections) {
      if (section.labelKey === 'nav.demo' && !demoNavVisible.value) {
        continue
      }

      if (section.labelKey === 'nav.insights') {
        const insightChildren = buildInsightsNavChildren(
          insightItems.value,
          route.path,
          t
        )

        if (insightChildren.length === 0) {
          // Keep the section shell so a cold load does not collapse Insights away.
          items.push({
            label: t(section.labelKey),
            defaultOpen: route.path.startsWith('/insights'),
            children: []
          })
          continue
        }

        items.push({
          label: t(section.labelKey),
          defaultOpen: insightChildren.some(child => child.active)
            || route.path.startsWith('/insights'),
          children: insightChildren
        })
        continue
      }

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
            ...applyPendingActionsBadge(
              applyInboxBadge(
                mapNavItem(item, route.path, t),
                unreadThreads.value,
                triageCount.value
              ),
              pendingCount.value
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
          applyPendingActionsBadge(
            applyInboxBadge(mapNavItem(item, route.path, t), unreadThreads.value, triageCount.value),
            pendingCount.value
          )
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
