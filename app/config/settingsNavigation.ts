import { Permission } from '~/types/permissions'

export interface SettingsNavItem {
  key: string
  labelKey: string
  icon: string
  to: string
  permission?: Permission | Array<Permission>
}

export interface SettingsNavGroup {
  key: string
  labelKey: string
  icon: string
  items: Array<SettingsNavItem>
}

export const settingsNavGroups: Array<SettingsNavGroup> = [
  {
    key: 'workspace',
    labelKey: 'settings.nav.workspace',
    icon: 'i-lucide-building-2',
    items: [
      {
        key: 'workspace.general',
        labelKey: 'settings.nav.general',
        icon: 'i-lucide-settings',
        to: '/settings/workspace/general'
      },
      {
        key: 'workspace.legal-entities',
        labelKey: 'settings.nav.legalEntities',
        icon: 'i-lucide-landmark',
        to: '/settings/workspace/legal-entities'
      },
      {
        key: 'workspace.connected-apps',
        labelKey: 'settings.nav.connectedApps',
        icon: 'i-lucide-plug',
        to: '/settings/workspace/connected-apps',
        permission: Permission.CredentialManage
      }
    ]
  },
  {
    key: 'team',
    labelKey: 'settings.nav.team',
    icon: 'i-lucide-users',
    items: [
      {
        key: 'team.members',
        labelKey: 'settings.nav.members',
        icon: 'i-lucide-user-round',
        to: '/settings/team/members',
        permission: Permission.RbacManage
      },
      {
        key: 'team.roles',
        labelKey: 'settings.nav.roles',
        icon: 'i-lucide-user-cog',
        to: '/settings/team/roles',
        permission: Permission.RbacManage
      }
    ]
  },
  {
    key: 'facilities',
    labelKey: 'settings.nav.facilities',
    icon: 'i-lucide-warehouse',
    items: [
      {
        key: 'facilities.sites',
        labelKey: 'settings.nav.sites',
        icon: 'i-lucide-map-pin',
        to: '/settings/facilities/sites'
      },
      {
        key: 'facilities.access-control',
        labelKey: 'settings.nav.accessControl',
        icon: 'i-lucide-lock-keyhole',
        to: '/settings/facilities/access-control',
        permission: Permission.CredentialManage
      }
    ]
  },
  {
    key: 'rentals',
    labelKey: 'settings.nav.rentals',
    icon: 'i-lucide-key-round',
    items: [
      {
        key: 'rentals.offers-reservations',
        labelKey: 'settings.nav.offersReservations',
        icon: 'i-lucide-calendar-clock',
        to: '/settings/rentals/offers-reservations'
      },
      {
        key: 'rentals.discounts',
        labelKey: 'settings.nav.discounts',
        icon: 'i-lucide-badge-percent',
        to: '/settings/rentals/discounts'
      },
      {
        key: 'rentals.size-guide',
        labelKey: 'settings.nav.sizeGuide',
        icon: 'i-lucide-ruler',
        to: '/settings/rentals/size-guide'
      },
      {
        key: 'rentals.e-signature',
        labelKey: 'settings.nav.eSignature',
        icon: 'i-lucide-signature',
        to: '/settings/rentals/e-signature',
        permission: Permission.CredentialManage
      }
    ]
  },
  {
    key: 'billing',
    labelKey: 'settings.nav.billing',
    icon: 'i-lucide-wallet',
    items: [
      {
        key: 'billing.defaults',
        labelKey: 'settings.nav.billingDefaults',
        icon: 'i-lucide-sliders-horizontal',
        to: '/settings/billing/defaults'
      },
      {
        key: 'billing.tax-rates',
        labelKey: 'settings.nav.taxRates',
        icon: 'i-lucide-receipt-text',
        to: '/settings/billing/tax-rates'
      },
      {
        key: 'billing.delinquency-policies',
        labelKey: 'settings.nav.delinquencyPolicies',
        icon: 'i-lucide-clock-alert',
        to: '/settings/billing/delinquency-policies'
      }
    ]
  },
  {
    key: 'communication',
    labelKey: 'settings.nav.communication',
    icon: 'i-lucide-messages-square',
    items: [
      {
        key: 'communication.email',
        labelKey: 'settings.nav.email',
        icon: 'i-lucide-mail',
        to: '/settings/communication/email',
        permission: Permission.CredentialManage
      },
      {
        key: 'communication.sms',
        labelKey: 'settings.nav.sms',
        icon: 'i-lucide-message-square-text',
        to: '/settings/communication/sms',
        permission: Permission.CredentialManage
      },
      {
        key: 'communication.whatsapp',
        labelKey: 'settings.nav.whatsapp',
        icon: 'i-lucide-message-circle',
        to: '/settings/communication/whatsapp',
        permission: Permission.CredentialManage
      },
      {
        key: 'communication.calls',
        labelKey: 'settings.nav.calls',
        icon: 'i-lucide-phone',
        to: '/settings/communication/calls',
        permission: Permission.CredentialManage
      }
    ]
  },
  {
    key: 'ai',
    labelKey: 'settings.nav.ai',
    icon: 'i-lucide-sparkles',
    items: [
      {
        key: 'ai.providers',
        labelKey: 'settings.nav.providers',
        icon: 'i-lucide-cpu',
        to: '/settings/ai/providers',
        permission: Permission.CredentialManage
      },
      {
        key: 'ai.usage',
        labelKey: 'settings.nav.usage',
        icon: 'i-lucide-gauge',
        to: '/settings/ai/usage',
        permission: Permission.ReportView
      },
      {
        key: 'ai.agent-permissions',
        labelKey: 'settings.nav.agentPermissions',
        icon: 'i-lucide-list-checks',
        to: '/settings/ai/agent-permissions',
        permission: [Permission.SettingsManage, Permission.AiAgentUse]
      },
      {
        key: 'ai.agent-channels',
        labelKey: 'settings.nav.agentChannels',
        icon: 'i-lucide-bot-message-square',
        to: '/settings/ai/agent-channels',
        permission: Permission.AiAgentBindingManage
      }
    ]
  },
  {
    key: 'insights',
    labelKey: 'settings.nav.insights',
    icon: 'i-lucide-chart-line',
    items: [
      {
        key: 'insights.sources',
        labelKey: 'settings.nav.reportSources',
        icon: 'i-lucide-cable',
        to: '/settings/insights/sources',
        permission: Permission.CredentialManage
      },
      {
        key: 'insights.reports',
        labelKey: 'settings.nav.reports',
        icon: 'i-lucide-scroll-text',
        to: '/settings/insights/reports',
        permission: Permission.SettingsManage
      }
    ]
  },
  {
    key: 'dataModel',
    labelKey: 'settings.nav.dataModel',
    icon: 'i-lucide-database',
    items: [
      {
        key: 'data-model.objects',
        labelKey: 'settings.nav.objects',
        icon: 'i-lucide-boxes',
        to: '/settings/data-model/objects'
      }
    ]
  },
  {
    key: 'compliance',
    labelKey: 'settings.nav.compliance',
    icon: 'i-lucide-shield-check',
    items: [
      {
        key: 'compliance.activity-log',
        labelKey: 'settings.nav.activityLog',
        icon: 'i-lucide-history',
        to: '/settings/compliance/activity-log'
      }
    ]
  }
]
