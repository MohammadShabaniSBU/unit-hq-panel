import type { NavigationMenuItem } from '@nuxt/ui'

export interface NavGroup {
  label: string
  icon: string
  items: Array<NavigationMenuItem>
}

export const navigationGroups: NavGroup[] = [
  {
    label: 'Marketing',
    icon: 'i-lucide-megaphone',
    items: [
      {
        label: 'Contacts',
        icon: 'i-lucide-user',
        to: '/marketing/contacts'
      },
      {
        label: 'Deals',
        icon: 'i-lucide-link-2',
        to: '/marketing/deals'
      },
      {
        label: 'Offers',
        icon: 'i-lucide-tag',
        to: '/marketing/offers'
      },
      {
        label: 'Campaigns',
        icon: 'i-lucide-megaphone',
        to: '/marketing/campaigns'
      }
    ]
  },
  {
    label: 'Operations',
    icon: 'i-lucide-clipboard-list',
    items: [
      {
        label: 'Reservations',
        icon: 'i-lucide-calendar-check',
        to: '/operations/reservations'
      },
      {
        label: 'Contracts',
        icon: 'i-lucide-file-pen-line',
        to: '/operations/contracts'
      },
      {
        label: 'Inbox',
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
    label: 'Facility',
    icon: 'i-lucide-building-2',
    items: [
      {
        label: 'Sites',
        icon: 'i-lucide-map-pin',
        to: '/facility/sites'
      },
      {
        label: 'Units',
        icon: 'i-lucide-house',
        to: '/facility/units'
      },
      {
        label: 'Unit sizes',
        icon: 'i-lucide-ruler',
        to: '/facility/unit-sizes'
      }
    ]
  }
]

export const settingsNavigation: NavigationMenuItem = {
  label: 'Settings',
  icon: 'i-lucide-settings',
  to: '/settings'
}
