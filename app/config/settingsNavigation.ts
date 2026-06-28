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
        labelKey: 'pages.settings.billing',
        icon: 'i-lucide-credit-card',
        to: '/settings/billing'
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
  }
]
