<script setup lang="ts">
import { ACCOUNT_PURPOSES } from '~/types/communications'
import type {
  AccountPurpose,
  ApiCommunicationChannel,
  CommunicationChannel,
  CommunicationProvider,
  ProviderOption
} from '~/types/communications'

const props = defineProps<{
  channel?: CommunicationChannel
}>()

const { t } = useI18n()
const toast = useToast()

const {
  channels,
  pending,
  error,
  refresh,
  stateFor,
  saveChannel,
  createWebhook,
  deleteWebhook,
  disconnectProvider
} = useCommunicationAccounts()

const visibleChannels = computed(() => {
  if (!props.channel) {
    return channels.value
  }

  return channels.value.filter(row => row.channel === props.channel)
})

const selectedProvider = reactive<Record<string, CommunicationProvider | ''>>({})
const selectedPurpose = reactive<Record<string, AccountPurpose>>({})
const credentialInputs = reactive<Record<string, Record<string, string>>>({})

function supportsPurpose(row: ApiCommunicationChannel): boolean {
  return row.channel === 'email' || row.channel === 'sms'
}

function purposeFor(row: ApiCommunicationChannel): AccountPurpose {
  if (!supportsPurpose(row)) {
    return 'all'
  }
  return selectedPurpose[row.channel] ?? 'all'
}

const purposeItems = computed(() => ACCOUNT_PURPOSES.map(value => ({
  label: t(`forms.communications.purposes.${value}`),
  value
})))

watch(channels, (rows) => {
  for (const row of rows) {
    selectedPurpose[row.channel] ??= 'all'
    if (!selectedProvider[row.channel] || purposeFor(row) === 'all') {
      selectedProvider[row.channel] = row.active_provider
        ?? row.provider_options[0]?.provider
        ?? ''
    }
    if (!credentialInputs[row.channel]) {
      credentialInputs[row.channel] = {}
    }
    const option = row.provider_options.find(o => o.provider === selectedProvider[row.channel])
    for (const key of Object.keys(option?.credential_fields ?? {})) {
      credentialInputs[row.channel][key] ??= ''
    }
  }
}, { immediate: true })

watch(selectedProvider, () => {
  for (const row of channels.value) {
    const provider = selectedProvider[row.channel]
    const option = row.provider_options.find(o => o.provider === provider)
    credentialInputs[row.channel] ??= {}
    for (const key of Object.keys(option?.credential_fields ?? {})) {
      credentialInputs[row.channel][key] ??= ''
    }
  }
}, { deep: true })

function optionFor(row: ApiCommunicationChannel): ProviderOption | undefined {
  const provider = selectedProvider[row.channel]
  if (!provider) {
    return undefined
  }
  return row.provider_options.find(o => o.provider === provider)
}

function accountFor(row: ApiCommunicationChannel) {
  const provider = selectedProvider[row.channel]
  if (!provider) {
    return undefined
  }
  const purpose = purposeFor(row)
  return row.accounts.find(a => a.provider === provider && (a.purpose ?? 'all') === purpose)
}

function onPurposeChange(row: ApiCommunicationChannel) {
  const purpose = purposeFor(row)
  const existing = row.accounts.find(a => (a.purpose ?? 'all') === purpose && a.is_active)
    ?? row.accounts.find(a => (a.purpose ?? 'all') === purpose)
  if (existing) {
    selectedProvider[row.channel] = existing.provider
  }
  const inputs = credentialInputs[row.channel]
  if (inputs) {
    for (const key of Object.keys(inputs)) {
      inputs[key] = ''
    }
  }
}

function providerItems(row: ApiCommunicationChannel) {
  return row.provider_options.map(o => ({
    label: o.label,
    value: o.provider
  }))
}

function statusColor(status: string) {
  if (status === 'connected') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  return 'neutral' as const
}

async function onSave(row: ApiCommunicationChannel) {
  const provider = selectedProvider[row.channel]
  if (!provider) {
    return
  }

  const option = optionFor(row)
  const credentials: Record<string, string> = {}
  for (const key of Object.keys(option?.credential_fields ?? {})) {
    credentials[key] = credentialInputs[row.channel]?.[key] ?? ''
  }

  const ok = await saveChannel(row.channel, {
    provider,
    credentials,
    activate: true,
    purpose: purposeFor(row)
  })

  if (ok) {
    for (const key of Object.keys(credentials)) {
      if (credentialInputs[row.channel]) {
        credentialInputs[row.channel][key] = ''
      }
    }
    toast.add({ title: t('forms.communications.saveSuccessMessage'), color: 'success' })
  }
}

async function onCreateWebhook(row: ApiCommunicationChannel) {
  const ok = await createWebhook(row.channel, purposeFor(row))
  if (ok) {
    toast.add({ title: t('forms.communications.webhookSuccessMessage'), color: 'success' })
  }
}

async function onDeleteWebhook(row: ApiCommunicationChannel) {
  const ok = await deleteWebhook(row.channel, purposeFor(row))
  if (ok) {
    toast.add({ title: t('forms.communications.webhookRemovedMessage'), color: 'success' })
  }
}

async function onDisconnect(row: ApiCommunicationChannel) {
  const account = accountFor(row)
  if (!account) {
    return
  }
  const ok = await disconnectProvider(row.channel, account.provider, purposeFor(row))
  if (ok) {
    toast.add({ title: t('forms.communications.removeSuccessMessage'), color: 'success' })
  }
}

function copyWebhookUrl(url: string) {
  navigator.clipboard.writeText(url)
  toast.add({ title: t('forms.communications.webhookUrlCopied'), color: 'success' })
}
</script>

<template>
  <div
    v-if="pending"
    class="flex items-center justify-center py-16"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin text-dimmed"
    />
  </div>

  <SettingsLoadError
    v-else-if="error"
    :message="t('pages.settings.loadError')"
    @retry="refresh()"
  />

  <div
    v-else
    class="flex flex-col gap-6"
  >
    <div
      v-for="row in visibleChannels"
      :key="row.channel"
      class="rounded-lg border border-default bg-default p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium text-highlighted">
          {{ row.label }}
        </p>
        <UBadge
          v-if="accountFor(row)"
          :color="statusColor(accountFor(row)!.status)"
          variant="subtle"
          :label="t(`forms.communications.status.${accountFor(row)!.status}`)"
        />
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <UFormField :label="t('forms.communications.provider')">
          <USelect
            v-model="selectedProvider[row.channel]"
            :items="providerItems(row)"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="supportsPurpose(row)"
          :label="t('forms.communications.purpose')"
        >
          <USelect
            v-model="selectedPurpose[row.channel]"
            :items="purposeItems"
            value-key="value"
            class="w-full"
            @update:model-value="onPurposeChange(row)"
          />
        </UFormField>
      </div>

      <p
        v-if="supportsPurpose(row)"
        class="mt-2 text-xs text-dimmed"
      >
        {{ t(`forms.communications.purposeHelp.${purposeFor(row)}`) }}
      </p>

      <div
        v-if="optionFor(row)"
        class="mt-3 grid gap-3 sm:grid-cols-2"
      >
        <UFormField
          v-for="(field, key) in optionFor(row)!.credential_fields"
          :key="String(key)"
          :label="field.label"
        >
          <UInput
            v-model="credentialInputs[row.channel][String(key)]"
            :type="field.secret ? 'password' : 'text'"
            :placeholder="accountFor(row)?.credentials[String(key)]?.has_value
              ? t('forms.communications.credentialPlaceholderExisting')
              : t('forms.communications.credentialPlaceholderNew')"
            class="w-full"
          />
          <p
            v-if="accountFor(row)?.credentials[String(key)]?.masked"
            class="mt-1 text-xs text-dimmed"
          >
            {{ t('forms.communications.currentKey', { masked: accountFor(row)!.credentials[String(key)].masked }) }}
          </p>
        </UFormField>
      </div>

      <p
        v-if="accountFor(row)?.credentials_unreadable"
        class="mt-2 text-xs text-error"
      >
        {{ t('forms.communications.credentialsUnreadable') }}
      </p>

      <p
        v-if="stateFor(row.channel).error"
        class="mt-2 text-sm text-error"
      >
        {{ stateFor(row.channel).error }}
      </p>

      <p
        v-if="accountFor(row)?.status === 'error' && accountFor(row)?.last_error"
        class="mt-2 text-sm text-error"
      >
        {{ accountFor(row)?.last_error }}
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <UButton
          :label="t('forms.communications.saveKey')"
          color="primary"
          :loading="stateFor(row.channel).submitting"
          @click="onSave(row)"
        />
        <UButton
          v-if="accountFor(row)"
          :label="t('forms.communications.remove')"
          color="error"
          variant="outline"
          :loading="stateFor(row.channel).submitting"
          @click="onDisconnect(row)"
        />
      </div>

      <div
        v-if="accountFor(row)"
        class="mt-4 flex flex-col gap-3 border-t border-default pt-4"
      >
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ t('forms.communications.webhook') }}
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ accountFor(row)!.webhook_configured
              ? t('forms.communications.webhookConfigured')
              : t('forms.communications.webhookNotConfigured') }}
          </p>
        </div>

        <template v-if="optionFor(row)?.auto_registers_webhooks">
          <div class="flex flex-wrap gap-2">
            <UButton
              :label="t('forms.communications.createWebhook')"
              color="neutral"
              variant="outline"
              :loading="stateFor(row.channel).submitting"
              @click="onCreateWebhook(row)"
            />
            <UButton
              v-if="accountFor(row)!.webhook_configured"
              :label="t('forms.communications.removeWebhook')"
              color="neutral"
              variant="ghost"
              :loading="stateFor(row.channel).submitting"
              @click="onDeleteWebhook(row)"
            />
          </div>
        </template>
        <template v-else-if="accountFor(row)!.webhook_url">
          <p class="text-sm text-dimmed">
            {{ t('forms.communications.webhookPasteHelp') }}
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <code class="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
              {{ accountFor(row)!.webhook_url }}
            </code>
            <UButton
              :label="t('forms.communications.copyWebhookUrl')"
              color="neutral"
              variant="outline"
              size="sm"
              @click="copyWebhookUrl(accountFor(row)!.webhook_url!)"
            />
          </div>
        </template>

        <SettingsAircallUsersSection
          v-if="row.channel === 'call'
            && selectedProvider[row.channel] === 'aircall'
            && accountFor(row)?.status === 'connected'"
        />
      </div>
    </div>
  </div>
</template>
