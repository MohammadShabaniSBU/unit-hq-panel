import type { NavigationMenuItem } from '@nuxt/ui'

export interface NavItem extends Omit<NavigationMenuItem, 'children'> {
  labelKey: string
  children?: Array<NavItem>
}

export interface NavSection {
  labelKey: string
  /** When false, section renders as a static label + flat links (no accordion chevron). */
  collapsible?: boolean
  items: Array<NavItem>
}

export const navigationSections: Array<NavSection> = [
  {
    labelKey: 'nav.pinned',
    collapsible: false,
    items: [
      {
        labelKey: 'nav.inbox',
        icon: 'i-lucide-inbox',
        to: '/inbox'
      }
    ]
  },
  {
    labelKey: 'nav.marketing',
    items: [
      {
        labelKey: 'nav.campaigns',
        icon: 'i-lucide-megaphone',
        to: '/marketing/campaigns'
      },
      {
        labelKey: 'nav.templates',
        icon: 'i-lucide-layout-template',
        children: [
          {
            labelKey: 'nav.email',
            icon: 'i-lucide-mail',
            to: '/marketing/templates/email'
          },
          {
            labelKey: 'nav.sms',
            icon: 'i-lucide-message-square',
            to: '/marketing/templates/sms'
          },
          {
            labelKey: 'nav.whatsapp',
            icon: 'i-lucide-message-circle',
            to: '/marketing/templates/whatsapp'
          },
          {
            labelKey: 'nav.documents',
            icon: 'i-lucide-file-text',
            to: '/marketing/templates/documents'
          }
        ]
      }
    ]
  },
  {
    labelKey: 'nav.automationsSection',
    items: [
      {
        labelKey: 'nav.automations',
        icon: 'i-lucide-bot',
        to: '/automations'
      },
      {
        labelKey: 'nav.debtProcess',
        icon: 'i-lucide-landmark',
        to: '/playbooks/debt-process'
      },
      {
        labelKey: 'nav.leadChase',
        icon: 'i-lucide-user-round-search',
        to: '/playbooks/lead-chase'
      }
    ]
  },
  {
    labelKey: 'nav.leasing',
    items: [
      {
        labelKey: 'nav.contacts',
        icon: 'i-lucide-user',
        to: '/leasing/contacts'
      },
      {
        labelKey: 'nav.tasks',
        icon: 'i-lucide-square-check-big',
        to: '/leasing/tasks'
      },
      {
        labelKey: 'nav.deals',
        icon: 'i-lucide-link-2',
        to: '/leasing/deals'
      },
      {
        labelKey: 'nav.offers',
        icon: 'i-lucide-tag',
        to: '/leasing/offers'
      },
      {
        labelKey: 'nav.unitMap',
        icon: 'i-lucide-map',
        to: '/leasing/unit-map'
      },
      {
        labelKey: 'nav.reservations',
        icon: 'i-lucide-calendar-check',
        to: '/leasing/reservations'
      },
      {
        labelKey: 'nav.contracts',
        icon: 'i-lucide-file-pen-line',
        to: '/leasing/contracts'
      },
      {
        labelKey: 'nav.moveOuts',
        icon: 'i-lucide-log-out',
        to: '/leasing/move-outs'
      }
    ]
  },
  {
    labelKey: 'nav.facility',
    items: [
      {
        labelKey: 'nav.units',
        icon: 'i-lucide-house',
        to: '/facility/units'
      },
      {
        labelKey: 'nav.unitClass',
        icon: 'i-lucide-ruler',
        to: '/facility/unit-classes'
      },
      {
        labelKey: 'nav.rates',
        icon: 'i-lucide-dollar-sign',
        to: '/facility/rates'
      },
      {
        labelKey: 'nav.discounts',
        icon: 'i-lucide-percent',
        to: '/facility/discounts'
      },
      {
        labelKey: 'nav.insurancePlans',
        icon: 'i-lucide-shield',
        to: '/facility/insurance-plans'
      },
      {
        labelKey: 'nav.accessControl',
        icon: 'i-lucide-key-round',
        to: '/facility/access-control'
      }
    ]
  },
  {
    labelKey: 'nav.billing',
    items: [
      {
        labelKey: 'nav.billingRuns',
        icon: 'i-lucide-play-circle',
        to: '/billing/runs'
      },
      {
        labelKey: 'nav.invoices',
        icon: 'i-lucide-file-text',
        to: '/billing/invoices'
      },
      {
        labelKey: 'nav.payments',
        icon: 'i-lucide-credit-card',
        to: '/billing/payments'
      },
      {
        labelKey: 'nav.delinquency',
        icon: 'i-lucide-alert-triangle',
        to: '/billing/delinquency'
      },
      {
        labelKey: 'nav.ledger',
        icon: 'i-lucide-book-open',
        to: '/billing/ledger'
      },
      {
        labelKey: 'nav.liensAuctions',
        icon: 'i-lucide-gavel',
        to: '/billing/liens-auctions'
      }
    ]
  },
  {
    labelKey: 'nav.insights',
    items: [
      {
        labelKey: 'nav.insightsIndex',
        icon: 'i-lucide-layout-list',
        to: '/insights'
      },
      {
        labelKey: 'nav.rentRollReport',
        icon: 'i-lucide-scroll-text',
        to: '/insights/rent-roll'
      },
      {
        labelKey: 'nav.occupancyReport',
        icon: 'i-lucide-pie-chart',
        to: '/insights/occupancy'
      },
      {
        labelKey: 'nav.demoReport',
        icon: 'i-lucide-table',
        to: '/insights/demo'
      }
    ]
  }
]

export const settingsNavigation: NavItem = {
  labelKey: 'nav.settings',
  icon: 'i-lucide-settings',
  to: '/settings/general'
}
