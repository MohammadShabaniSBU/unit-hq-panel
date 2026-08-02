<script setup lang="ts">
import type { ApiEsignAccount, EsignProviderOption } from '~/types/esign'

const { t } = useI18n()
const toast = useToast()

const {
  accounts,
  providerOptions,
  activeProvider,
  pending,
  error,
  refresh,
  submitting,
  actionError,
  save,
  createWebhook,
  disconnect
} = useEsignSettings()

const selectedProvider = ref<string>('')
const credentialInputs = reactive<Record<string, string>>({})

watch([providerOptions, activeProvider], () => {
  selectedProvider.value = activeProvider.value
    ?? providerOptions.value[0]?.provider
    ?? ''
  syncCredentialKeys()
}, { immediate: true })

watch(selectedProvider, () => {
  syncCredentialKeys()
})

function syncCredentialKeys() {
  const option = optionFor()
  for (const key of Object.keys(option?.credential_fields ?? {})) {
    credentialInputs[key] ??= ''
  }
}

function optionFor(): EsignProviderOption | undefined {
  return providerOptions.value.find(o => o.provider === selectedProvider.value)
}

function accountFor(): ApiEsignAccount | undefined {
  return accounts.value.find(a => a.provider === selectedProvider.value)
}

function providerItems() {
  return providerOptions.value.map(o => ({
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

async function onSave() {
  const provider = selectedProvider.value
  if (!provider) {
    return
  }

  const option = optionFor()
  const credentials: Record<string, string> = {}
  for (const key of Object.keys(option?.credential_fields ?? {})) {
    credentials[key] = credentialInputs[key] ?? ''
  }

  const ok = await save({
    provider,
    credentials,
    activate: true
  })

  if (ok) {
    for (const key of Object.keys(credentials)) {
      credentialInputs[key] = ''
    }
    toast.add({ title: t('settings.esign.saveSuccessMessage'), color: 'success' })
  }
}

async function onCreateWebhook() {
  const ok = await createWebhook()
  if (ok) {
    toast.add({ title: t('settings.esign.webhookSuccessMessage'), color: 'success' })
  }
}

async function onDisconnect() {
  const ok = await disconnect()
  if (ok) {
    toast.add({ title: t('settings.esign.removeSuccessMessage'), color: 'success' })
  }
}

function copyWebhookUrl(url: string) {
  navigator.clipboard.writeText(url)
  toast.add({ title: t('settings.esign.webhookUrlCopied'), color: 'success' })
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
    class="rounded-lg border border-default p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ t('settings.esign.title') }}
      </p>
      <UBadge
        v-if="accountFor()"
        :color="statusColor(accountFor()!.status)"
        variant="subtle"
        :label="t(`settings.esign.status.${accountFor()!.status}`)"
      />
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <UFormField :label="t('settings.esign.provider')">
        <USelect
          v-model="selectedProvider"
          :items="providerItems()"
          value-key="value"
          class="w-full"
        />
      </UFormField>
    </div>

    <div
      v-if="optionFor()"
      class="mt-3 grid gap-3 sm:grid-cols-2"
    >
      <UFormField
        v-for="(field, key) in optionFor()!.credential_fields"
        :key="String(key)"
        :label="field.label"
      >
        <UInput
          v-model="credentialInputs[String(key)]"
          :type="field.secret ? 'password' : 'text'"
          :placeholder="accountFor()?.credentials[String(key)]?.has_value
            ? t('settings.esign.credentialPlaceholderExisting')
            : t('settings.esign.credentialPlaceholderNew')"
          class="w-full"
        />
        <p
          v-if="accountFor()?.credentials[String(key)]?.masked"
          class="mt-1 text-xs text-dimmed"
        >
          {{ t('settings.esign.currentKey', { masked: accountFor()!.credentials[String(key)].masked }) }}
        </p>
      </UFormField>
    </div>

    <p
      v-if="accountFor()?.credentials_unreadable"
      class="mt-2 text-xs text-error"
    >
      {{ t('settings.esign.credentialsUnreadable') }}
    </p>

    <p
      v-if="actionError"
      class="mt-2 text-sm text-error"
    >
      {{ actionError }}
    </p>

    <p
      v-if="accountFor()?.status === 'error' && accountFor()?.last_error"
      class="mt-2 text-sm text-error"
    >
      {{ accountFor()?.last_error }}
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        :label="t('settings.esign.saveKey')"
        color="primary"
        :loading="submitting"
        @click="onSave"
      />
      <UButton
        v-if="accountFor()"
        :label="t('settings.esign.remove')"
        color="error"
        variant="outline"
        :loading="submitting"
        @click="onDisconnect"
      />
    </div>

    <div
      v-if="accountFor()"
      class="mt-4 flex flex-col gap-3 border-t border-default pt-4"
    >
      <div>
        <p class="text-xs uppercase tracking-wide text-dimmed">
          {{ t('settings.esign.webhook') }}
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ t(`settings.esign.webhookState.${accountFor()!.webhook_state}`) }}
        </p>
      </div>

      <p
        v-if="accountFor()!.webhook_url"
        class="text-sm text-dimmed"
      >
        {{ t('settings.esign.webhookPasteHelp') }}
      </p>

      <div
        v-if="accountFor()!.webhook_url"
        class="flex flex-wrap items-center gap-2"
      >
        <code class="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
          {{ accountFor()!.webhook_url }}
        </code>
        <UButton
          :label="t('settings.esign.copyWebhookUrl')"
          color="neutral"
          variant="outline"
          size="sm"
          @click="copyWebhookUrl(accountFor()!.webhook_url!)"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          :label="t('settings.esign.createWebhook')"
          color="neutral"
          variant="outline"
          :loading="submitting"
          :disabled="accountFor()!.status !== 'connected'"
          @click="onCreateWebhook"
        />
      </div>
    </div>
  </div>
</template>
