<script setup lang="ts">
import type { AiProviderAccount } from '~/types/ai'

const { t } = useI18n()
const toast = useToast()

const {
  accounts,
  pending,
  error,
  refresh,
  submitting,
  setDefault,
  archive
} = useAiProviderAccounts()

const { providers, pending: providersPending, error: providersError, refresh: refreshProviders }
  = useAiProviders()

const formOpen = ref(false)
const editing = ref<AiProviderAccount | null>(null)
const archiveTarget = ref<AiProviderAccount | null>(null)

function statusColor(status: string) {
  if (status === 'connected') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  if (status === 'pending') {
    return 'warning' as const
  }
  return 'neutral' as const
}

function providerLabel(provider: string) {
  return providers.value.find(row => row.key === provider)?.label ?? provider
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(account: AiProviderAccount) {
  editing.value = account
  formOpen.value = true
}

async function onSetDefault(account: AiProviderAccount) {
  const ok = await setDefault(account.id)
  if (ok) {
    toast.add({ title: t('settings.ai.connections.defaultSuccess'), color: 'success' })
  } else {
    toast.add({
      title: t('settings.ai.connections.defaultRequiresModel'),
      color: 'error'
    })
  }
}

async function onArchiveConfirm() {
  if (!archiveTarget.value) {
    return
  }
  const ok = await archive(archiveTarget.value.id)
  if (ok) {
    toast.add({ title: t('settings.ai.connections.archiveSuccess'), color: 'success' })
    archiveTarget.value = null
  }
}

function onRetry() {
  void refresh()
  void refreshProviders()
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ t('settings.ai.connections.title') }}
      </p>
      <UButton
        :label="t('settings.ai.connections.add')"
        icon="i-lucide-plus"
        color="primary"
        @click="openCreate"
      />
    </div>

    <p class="mb-4 text-xs text-dimmed">
      {{ t('settings.ai.connections.subtitle') }}
    </p>

    <div
      v-if="pending || providersPending"
      class="flex items-center justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <SettingsLoadError
      v-else-if="error || providersError"
      :message="t('pages.settings.loadError')"
      @retry="onRetry"
    />

    <div
      v-else-if="accounts.length === 0"
      class="rounded-lg border border-dashed border-default py-10 text-center text-sm text-dimmed"
    >
      {{ t('settings.ai.connections.empty') }}
    </div>

    <ul
      v-else
      class="divide-y divide-default rounded-lg border border-default"
    >
      <li
        v-for="account in accounts"
        :key="account.id"
        class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-medium text-highlighted">
              {{ account.display_name }}
            </p>
            <UBadge
              :color="statusColor(account.connection_status)"
              variant="subtle"
              :label="t(`settings.ai.connections.status.${account.connection_status}`)"
            />
            <UBadge
              v-if="account.is_default"
              color="primary"
              variant="subtle"
              :label="t('settings.ai.connections.default')"
            />
          </div>
          <p class="truncate text-xs text-dimmed">
            {{ providerLabel(account.provider) }}
            <template v-if="account.default_model">
              · {{ t('settings.ai.connections.usingModel', { model: account.default_model }) }}
            </template>
          </p>
          <p class="text-xs text-dimmed">
            {{ t('settings.ai.connections.allowedModelsCount', { count: account.allowed_models.length }) }}
          </p>
          <p
            v-if="account.connection_status === 'error' && account.last_error"
            class="text-xs text-error"
          >
            {{ account.last_error }}
          </p>
          <p
            v-if="account.credentials_unreadable"
            class="text-xs text-error"
          >
            {{ t('settings.ai.connections.credentialsUnreadable') }}
          </p>
        </div>

        <div class="flex shrink-0 flex-wrap gap-1">
          <UButton
            v-if="!account.is_default"
            size="xs"
            color="neutral"
            variant="ghost"
            :label="t('settings.ai.connections.setDefault')"
            :loading="submitting"
            @click="onSetDefault(account)"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :label="t('settings.ai.connections.editAction')"
            @click="openEdit(account)"
          />
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            :label="t('settings.ai.connections.archive')"
            @click="archiveTarget = account"
          />
        </div>
      </li>
    </ul>

    <SettingsAiProviderAccountFormSlideover
      v-model:open="formOpen"
      :account="editing"
      :providers="providers"
    />

    <UModal
      :open="archiveTarget != null"
      @update:open="(value: boolean) => { if (!value) archiveTarget = null }"
    >
      <template #content>
        <div class="p-4 space-y-4">
          <p class="text-sm font-medium text-highlighted">
            {{ t('settings.ai.connections.archiveConfirmTitle') }}
          </p>
          <p class="text-sm text-dimmed">
            {{ t('settings.ai.connections.archiveConfirmBody', {
              name: archiveTarget?.display_name ?? ''
            }) }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('settings.ai.connections.cancel')"
              @click="archiveTarget = null"
            />
            <UButton
              color="error"
              :label="t('settings.ai.connections.archive')"
              :loading="submitting"
              @click="onArchiveConfirm"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
