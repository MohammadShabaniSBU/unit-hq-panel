export interface SettingsNavItem {
  labelKey: string
  icon: string
  to: string
}

export interface SettingsNavGroup {
  labelKey: string
  items: Array<SettingsNavItem>
}

export const settingsNavGroups: Array<SettingsNavGroup> = [
  {
    labelKey: 'pages.settings.organisation',
    items: [
      {
        labelKey: 'pages.settings.general',
        icon: 'i-lucide-building-2',
        to: '/settings/general'
      },
      {
        labelKey: 'pages.settings.people.title',
        icon: 'i-lucide-users',
        to: '/settings/people'
      },
      {
        labelKey: 'pages.settings.roles.title',
        icon: 'i-lucide-shield',
        to: '/settings/roles'
      },
      {
        labelKey: 'pages.settings.legalEntities.title',
        icon: 'i-lucide-landmark',
        to: '/settings/legal-entities'
      },
      {
        labelKey: 'pages.settings.billing',
        icon: 'i-lucide-credit-card',
        to: '/settings/billing'
      },
      {
        labelKey: 'pages.settings.payments',
        icon: 'i-lucide-landmark',
        to: '/settings/payments'
      },
      {
        labelKey: 'pages.settings.communications',
        icon: 'i-lucide-mail',
        to: '/settings/communications'
      },
      {
        labelKey: 'pages.settings.lateFeesLiens',
        icon: 'i-lucide-gavel',
        to: '/settings/late-fees-liens'
      },
      {
        labelKey: 'pages.settings.taxRates.title',
        icon: 'i-lucide-percent',
        to: '/settings/tax-rates'
      },
      {
        labelKey: 'pages.settings.customAttributes.title',
        icon: 'i-lucide-tags',
        to: '/settings/custom-attributes'
      },
      {
        labelKey: 'pages.settings.objectCustomization.title',
        icon: 'i-lucide-panels-top-left',
        to: '/settings/object-customization/contact'
      }
    ]
  },
  {
    labelKey: 'pages.settings.integrations',
    items: [
      {
        labelKey: 'pages.settings.esign',
        icon: 'i-lucide-pen-line',
        to: '/settings/esign'
      },
      {
        labelKey: 'pages.settings.access',
        icon: 'i-lucide-lock',
        to: '/settings/access'
      }
    ]
  },
  {
    labelKey: 'pages.settings.facility',
    items: [
      {
        labelKey: 'pages.settings.sites',
        icon: 'i-lucide-map-pin',
        to: '/settings/facility/sites'
      },
      {
        labelKey: 'pages.settings.discounts',
        icon: 'i-lucide-percent',
        to: '/settings/facility/discounts'
      }
    ]
  },
  {
    labelKey: 'pages.settings.leasing',
    items: [
      {
        labelKey: 'pages.settings.leasingSettings',
        icon: 'i-lucide-key-round',
        to: '/settings/leasing'
      }
    ]
  },
  {
    labelKey: 'pages.settings.compliance',
    items: [
      {
        labelKey: 'pages.settings.activityLog',
        icon: 'i-lucide-scroll-text',
        to: '/settings/activity-log'
      }
    ]
  }
]
