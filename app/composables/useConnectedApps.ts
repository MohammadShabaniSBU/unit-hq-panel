import type { CommunicationChannel } from '~/types/communications'
import { Permission } from '~/types/permissions'

export type ConnectedAppCapability
  = 'payments'
    | 'email'
    | 'sms'
    | 'whatsapp'
    | 'calls'
    | 'eSignature'
    | 'accessControl'
    | 'insights'
    | 'ai'

export interface ConnectedAppRow {
  key: string
  provider: string
  displayName: string
  icon: string
  capability: ConnectedAppCapability
  scopeLabel: string
  status: string | null
  configureTo: string
}

const BRAND_ICONS: Record<string, string> = {
  stripe: 'i-simple-icons-stripe',
  brevo: 'i-simple-icons-brevo',
  twilio: 'i-simple-icons-twilio',
  whatsapp: 'i-simple-icons-whatsapp',
  metabase: 'i-simple-icons-metabase',
  anthropic: 'i-simple-icons-anthropic',
  openai: 'i-simple-icons-openai'
}

const CAPABILITY_ICONS: Record<ConnectedAppCapability, string> = {
  payments: 'i-lucide-landmark',
  email: 'i-lucide-mail',
  sms: 'i-lucide-message-square-text',
  whatsapp: 'i-lucide-message-circle',
  calls: 'i-lucide-phone',
  eSignature: 'i-lucide-signature',
  accessControl: 'i-lucide-lock-keyhole',
  insights: 'i-lucide-chart-line',
  ai: 'i-lucide-cpu'
}

const CHANNEL_CAPABILITY: Record<CommunicationChannel, ConnectedAppCapability> = {
  email: 'email',
  sms: 'sms',
  whatsapp: 'whatsapp',
  call: 'calls'
}

const CHANNEL_CONFIGURE: Record<CommunicationChannel, string> = {
  email: '/settings/communication/email',
  sms: '/settings/communication/sms',
  whatsapp: '/settings/communication/whatsapp',
  call: '/settings/communication/calls'
}

function brandIcon(provider: string, capability: ConnectedAppCapability): string {
  return BRAND_ICONS[provider] ?? CAPABILITY_ICONS[capability]
}

export function useConnectedApps() {
  const { t } = useI18n()
  const { can } = usePermissions()
  const workspaceScope = computed(() => t('settings.connectedApps.workspaceScope'))

  const stripe = useLegalEntitiesStripeOverview()
  const comms = useCommunicationAccounts()
  const esign = useEsignSettings()
  const access = useAccessSettings()
  const analytics = useAnalyticsAccounts()
  const ai = useAiProviderAccounts()

  const pending = computed(() =>
    stripe.pending.value
    || comms.pending.value
    || esign.pending.value
    || access.pending.value
    || analytics.pending.value
    || ai.pending.value
  )

  const rows = computed<Array<ConnectedAppRow>>(() => {
    const items: Array<ConnectedAppRow> = []

    if (!stripe.error.value) {
      for (const row of stripe.rows.value) {
        items.push({
          key: `payments-${row.id}`,
          provider: 'stripe',
          displayName: 'Stripe',
          icon: brandIcon('stripe', 'payments'),
          capability: 'payments',
          scopeLabel: row.name,
          status: row.status,
          configureTo: `/settings/workspace/legal-entities/${row.id}`
        })
      }
    }

    if (!comms.error.value) {
      for (const channel of comms.channels.value) {
        const capability = CHANNEL_CAPABILITY[channel.channel]
        for (const account of channel.accounts) {
          items.push({
            key: `comms-${channel.channel}-${account.id}`,
            provider: account.provider,
            displayName: channel.provider_options.find(option => option.provider === account.provider)?.label
              ?? account.provider,
            icon: brandIcon(account.provider, capability),
            capability,
            scopeLabel: workspaceScope.value,
            status: account.status,
            configureTo: CHANNEL_CONFIGURE[channel.channel]
          })
        }
      }
    }

    if (!esign.error.value) {
      for (const account of esign.accounts.value) {
        items.push({
          key: `esign-${account.id}`,
          provider: String(account.provider),
          displayName: account.display_name || String(account.provider),
          icon: brandIcon(String(account.provider), 'eSignature'),
          capability: 'eSignature',
          scopeLabel: workspaceScope.value,
          status: account.status,
          configureTo: '/settings/rentals/e-signature'
        })
      }
    }

    if (!access.error.value) {
      for (const account of access.accounts.value) {
        items.push({
          key: `access-${account.id}`,
          provider: String(account.provider),
          displayName: account.display_name || String(account.provider),
          icon: brandIcon(String(account.provider), 'accessControl'),
          capability: 'accessControl',
          scopeLabel: workspaceScope.value,
          status: account.status,
          configureTo: '/settings/facilities/access-control'
        })
      }
    }

    if (!analytics.error.value) {
      for (const account of analytics.accounts.value) {
        if (account.archived_at) {
          continue
        }
        items.push({
          key: `analytics-${account.id}`,
          provider: String(account.provider),
          displayName: account.display_name || String(account.provider),
          icon: brandIcon(String(account.provider), 'insights'),
          capability: 'insights',
          scopeLabel: workspaceScope.value,
          status: account.connection_status,
          configureTo: '/settings/insights/sources'
        })
      }
    }

    if (!ai.error.value) {
      for (const account of ai.accounts.value) {
        if (account.archived_at) {
          continue
        }
        items.push({
          key: `ai-${account.id}`,
          provider: String(account.provider),
          displayName: account.display_name || String(account.provider),
          icon: brandIcon(String(account.provider), 'ai'),
          capability: 'ai',
          scopeLabel: workspaceScope.value,
          status: account.connection_status,
          configureTo: '/settings/ai/providers'
        })
      }
    }

    return items
  })

  function statusLabel(status: string | null): string {
    if (!status) {
      return t('settings.connectedApps.configured')
    }

    const known = ['connected', 'disconnected', 'error', 'pending'] as const
    if ((known as ReadonlyArray<string>).includes(status)) {
      return t(`settings.connectedApps.statuses.${status}`)
    }

    return status
  }

  return {
    rows,
    pending,
    canShow: computed(() => can(Permission.CredentialManage)),
    statusLabel
  }
}
