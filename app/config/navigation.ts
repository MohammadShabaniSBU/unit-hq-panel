import type { NavigationMenuItem } from '@nuxt/ui'

export interface NavItem extends NavigationMenuItem {
  labelKey: string
}

export interface NavGroup {
  labelKey: string
  icon: string
  items: NavItem[]
}

export const navigationGroups: NavGroup[] = [
  {
    labelKey: 'nav.marketing',
    icon: 'i-lucide-megaphone',
    items: [
      {
        labelKey: 'nav.contacts',
        icon: 'i-lucide-user',
        to: '/marketing/contacts'
      },
      {
        labelKey: 'nav.deals',
        icon: 'i-lucide-link-2',
        to: '/marketing/deals'
      },
      {
        labelKey: 'nav.offers',
        icon: 'i-lucide-tag',
        to: '/marketing/offers'
      },
      {
        labelKey: 'nav.campaigns',
        icon: 'i-lucide-megaphone',
        to: '/marketing/campaigns'
      }
    ]
  },
  {
    labelKey: 'nav.operations',
    icon: 'i-lucide-clipboard-list',
    items: [
      {
        labelKey: 'nav.reservations',
        icon: 'i-lucide-calendar-check',
        to: '/operations/reservations'
      },
      {
        labelKey: 'nav.contracts',
        icon: 'i-lucide-file-pen-line',
        to: '/operations/contracts'
      },
      {
        labelKey: 'nav.inbox',
        icon: 'i-lucide-inbox',
        to: '/operations/inbox',
        badge: {
          label: '7',
          color: 'primary',
          size: 'sm'
        }
      }
    ]
  },
  {
    labelKey: 'nav.facility',
    icon: 'i-lucide-building-2',
    items: [
      {
        labelKey: 'nav.sites',
        icon: 'i-lucide-map-pin',
        to: '/facility/sites'
      },
      {
        labelKey: 'nav.units',
        icon: 'i-lucide-house',
        to: '/facility/units'
      },
      {
        labelKey: 'nav.unitClass',
        icon: 'i-lucide-ruler',
        to: '/facility/unit-classes'
      }
    ]
  }
]

export const settingsNavigation: NavItem = {
  labelKey: 'nav.settings',
  icon: 'i-lucide-settings',
  to: '/settings'
}
