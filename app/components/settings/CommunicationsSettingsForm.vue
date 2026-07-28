<script setup lang="ts">
import type { ApiCommunicationAccount, CommunicationProviderType } from '~/types/communications'

const { t } = useI18n()
const toast = useToast()

const { accounts, pending, error, refresh, stateFor, saveApiKey, createWebhook, removeAccount } = useCommunicationAccounts()

const apiKeyInputs = reactive<Record<string, string>>({})

function providerLabel(providerType: CommunicationProviderType) {
  return t(`forms.communications.providers.${providerType}`)
}

function statusColor(status: ApiCommunicationAccount['status']) {
  if (status === 'connected') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  return 'neutral' as const
}

async function onSaveApiKey(account: ApiCommunicationAccount) {
  const value = (apiKeyInputs[account.provider_type] ?? '').trim()
  const ok = await saveApiKey(account.provider_type, value)
  if (ok) {
    apiKeyInputs[account.provider_type] = ''
    toast.add({ title: t('forms.communications.saveSuccessMessage'), color: 'success' })
  }
}

async function onCreateWebhook(account: ApiCommunicationAccount) {
  const ok = await createWebhook(account.provider_type)
  if (ok) {
    toast.add({ title: t('forms.communications.webhookSuccessMessage'), color: 'success' })
  }
}

async function onRemove(account: ApiCommunicationAccount) {
  const ok = await removeAccount(account.provider_type)
  if (ok) {
    toast.add({ title: t('forms.communications.removeSuccessMessage'), color: 'success' })
  }
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
    class="flex flex-col gap-5"
  >
    <div
      v-for="account in accounts"
      :key="account.provider_type"
      class="rounded-lg border border-default p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-sm font-medium text-highlighted">
            {{ providerLabel(account.provider_type) }}
          </p>
          <p
            v-if="account.credentials_unreadable"
            class="mt-1 text-xs text-error"
          >
            {{ t('forms.communications.credentialsUnreadable') }}
          </p>
          <p
            v-else-if="account.api_key_masked"
            class="mt-1 text-xs text-dimmed"
          >
            {{ t('forms.communications.currentKey', { masked: account.api_key_masked }) }}
          </p>
        </div>
        <UBadge
          :color="statusColor(account.status)"
          variant="subtle"
          :label="t(`forms.communications.status.${account.status}`)"
        />
      </div>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <UFormField
          :label="t('forms.communications.apiKey')"
          class="w-full"
        >
          <UInput
            v-model="apiKeyInputs[account.provider_type]"
            type="password"
            :placeholder="account.has_api_key ? t('forms.communications.apiKeyPlaceholderExisting') : t('forms.communications.apiKeyPlaceholderNew')"
            class="w-full"
          />
        </UFormField>
        <UButton
          :label="t('forms.communications.saveKey')"
          color="primary"
          :loading="stateFor(account.provider_type).submitting"
          @click="onSaveApiKey(account)"
        />
      </div>

      <p
        v-if="stateFor(account.provider_type).error"
        class="mt-2 text-sm text-error"
      >
        {{ stateFor(account.provider_type).error }}
      </p>

      <p
        v-if="account.status === 'error' && account.last_error"
        class="mt-2 text-sm text-error"
      >
        {{ account.last_error }}
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-default pt-4">
        <div class="flex-1">
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ t('forms.communications.webhook') }}
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ account.webhook_configured
              ? t('forms.communications.webhookConfigured')
              : t('forms.communications.webhookNotConfigured') }}
          </p>
        </div>
        <UButton
          :label="t('forms.communications.createWebhook')"
          color="neutral"
          variant="outline"
          :disabled="!account.has_api_key"
          :loading="stateFor(account.provider_type).submitting"
          @click="onCreateWebhook(account)"
        />
        <UButton
          :label="t('forms.communications.remove')"
          color="error"
          variant="outline"
          :disabled="!account.has_api_key"
          :loading="stateFor(account.provider_type).submitting"
          @click="onRemove(account)"
        />
      </div>
    </div>
  </div>
</template>
