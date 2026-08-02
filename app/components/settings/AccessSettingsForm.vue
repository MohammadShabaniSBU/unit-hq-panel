<script setup lang="ts">
import type { AccessProviderOption, ApiAccessAccount } from '~/types/access'

const { t, d } = useI18n()
const toast = useToast()

const {
  accounts,
  providerOptions,
  activeProvider,
  attention,
  pending,
  error,
  refresh,
  submitting,
  actionError,
  save,
  createWebhook,
  refreshPoints,
  revokeUnknownGrant,
  disconnect
} = useAccessSettings()

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

function optionFor(): AccessProviderOption | undefined {
  return providerOptions.value.find(o => o.provider === selectedProvider.value)
}

function accountFor(): ApiAccessAccount | undefined {
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

function modeLabel(mode: string) {
  return t(`settings.access.modes.${mode}`, mode)
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
    toast.add({ title: t('settings.access.saveSuccessMessage'), color: 'success' })
  }
}

async function onCreateWebhook() {
  const ok = await createWebhook()
  if (ok) {
    toast.add({ title: t('settings.access.webhookSuccessMessage'), color: 'success' })
  }
}

async function onRefreshPoints() {
  const ok = await refreshPoints()
  if (ok) {
    toast.add({ title: t('settings.access.refreshPointsSuccessMessage'), color: 'success' })
  }
}

async function onDisconnect() {
  const ok = await disconnect()
  if (ok) {
    toast.add({ title: t('settings.access.removeSuccessMessage'), color: 'success' })
  }
}

async function onRevokeUnknown(grantRef: string) {
  const ok = await revokeUnknownGrant(grantRef)
  if (ok) {
    toast.add({ title: t('settings.access.health.revokeSuccess'), color: 'success' })
  }
}

function copyWebhookUrl(url: string) {
  navigator.clipboard.writeText(url)
  toast.add({ title: t('settings.access.webhookUrlCopied'), color: 'success' })
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
        {{ t('settings.access.title') }}
      </p>
      <UBadge
        v-if="accountFor()"
        :color="statusColor(accountFor()!.status)"
        variant="subtle"
        :label="t(`settings.access.status.${accountFor()!.status}`)"
      />
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <UFormField :label="t('settings.access.provider')">
        <USelect
          v-model="selectedProvider"
          :items="providerItems()"
          value-key="value"
          class="w-full"
        />
      </UFormField>
    </div>

    <div
      v-if="(accountFor()?.credential_modes ?? optionFor()?.credential_modes ?? []).length"
      class="mt-3 flex flex-wrap items-center gap-2"
    >
      <span class="text-xs uppercase tracking-wide text-dimmed">
        {{ t('settings.access.credentialModes') }}
      </span>
      <UBadge
        v-for="mode in (accountFor()?.credential_modes ?? optionFor()?.credential_modes ?? [])"
        :key="mode"
        color="neutral"
        variant="subtle"
        :label="modeLabel(String(mode))"
      />
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
            ? t('settings.access.credentialPlaceholderExisting')
            : t('settings.access.credentialPlaceholderNew')"
          class="w-full"
        />
        <p
          v-if="accountFor()?.credentials[String(key)]?.masked"
          class="mt-1 text-xs text-dimmed"
        >
          {{ t('settings.access.currentKey', { masked: accountFor()?.credentials[String(key)]?.masked }) }}
        </p>
      </UFormField>
    </div>

    <p
      v-if="accountFor()?.credentials_unreadable"
      class="mt-2 text-xs text-error"
    >
      {{ t('settings.access.credentialsUnreadable') }}
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
        :label="t('settings.access.saveKey')"
        color="primary"
        :loading="submitting"
        @click="onSave"
      />
      <UButton
        v-if="accountFor()"
        :label="t('settings.access.remove')"
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
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ t('settings.access.discoveredPoints') }}
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ t('settings.access.discoveredPointsCount', { count: accountFor()!.discovered_points_count }) }}
          </p>
          <p
            v-if="accountFor()!.points_discovered_at"
            class="mt-1 text-xs text-dimmed"
          >
            {{ t('settings.access.pointsDiscoveredAt', { at: d(accountFor()!.points_discovered_at!, 'short') }) }}
          </p>
          <p
            v-else
            class="mt-1 text-xs text-dimmed"
          >
            {{ t('settings.access.pointsNeverRefreshed') }}
          </p>
        </div>
        <UButton
          :label="t('settings.access.refreshPoints')"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="submitting"
          :disabled="accountFor()!.status !== 'connected'"
          @click="onRefreshPoints"
        />
      </div>

      <div
        v-if="attention.unmapped_points_count > 0 || attention.unresolved_contacts_count > 0"
        class="rounded-md bg-muted px-3 py-2 text-xs text-dimmed"
      >
        <p v-if="attention.unmapped_points_count > 0">
          {{ t('settings.access.attentionUnmapped', { count: attention.unmapped_points_count }) }}
        </p>
        <p v-if="attention.unresolved_contacts_count > 0">
          {{ t('settings.access.attentionUnresolved', { count: attention.unresolved_contacts_count }) }}
        </p>
      </div>

      <div>
        <p class="text-xs uppercase tracking-wide text-dimmed">
          {{ t('settings.access.webhook') }}
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ t(`settings.access.webhookState.${accountFor()!.webhook_state}`) }}
        </p>
      </div>

      <p
        v-if="accountFor()!.webhook_url"
        class="text-sm text-dimmed"
      >
        {{ t('settings.access.webhookPasteHelp') }}
      </p>

      <div
        v-if="accountFor()!.webhook_url"
        class="flex flex-wrap items-center gap-2"
      >
        <code class="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
          {{ accountFor()!.webhook_url }}
        </code>
        <UButton
          :label="t('settings.access.copyWebhookUrl')"
          color="neutral"
          variant="outline"
          size="sm"
          @click="copyWebhookUrl(accountFor()!.webhook_url!)"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          :label="t('settings.access.createWebhook')"
          color="neutral"
          variant="outline"
          :loading="submitting"
          :disabled="accountFor()!.status !== 'connected'"
          @click="onCreateWebhook"
        />
      </div>

      <div class="border-t border-default pt-4">
        <p class="text-xs uppercase tracking-wide text-dimmed">
          {{ t('settings.access.health.title') }}
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ accountFor()!.last_full_synced_at
            ? t('settings.access.health.lastSync', { at: d(accountFor()!.last_full_synced_at!, 'short') })
            : t('settings.access.health.neverSynced') }}
        </p>
        <p class="mt-1 text-xs text-dimmed">
          {{ t('settings.access.health.counts', {
            applied: accountFor()!.sync_attention?.applied_count ?? 0,
            failed: accountFor()!.sync_attention?.failed_count ?? 0
          }) }}
        </p>

        <div
          v-if="(accountFor()!.sync_attention?.unknown_grants ?? []).length > 0"
          class="mt-3 space-y-2"
        >
          <p class="text-xs font-medium text-highlighted">
            {{ t('settings.access.health.unknownGrants') }}
          </p>
          <div
            v-for="grant in accountFor()!.sync_attention.unknown_grants"
            :key="grant.grant_ref"
            class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs"
          >
            <span class="text-dimmed">
              {{ grant.grant_ref }}
              <span v-if="grant.provider_point_id"> · {{ grant.provider_point_id }}</span>
            </span>
            <UButton
              :label="t('settings.access.health.revoke')"
              size="xs"
              color="error"
              variant="outline"
              :loading="submitting"
              @click="onRevokeUnknown(grant.grant_ref)"
            />
          </div>
        </div>
      </div>
    </div>

    <SettingsAccessPointsMapping />
  </div>
</template>
