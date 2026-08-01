<script setup lang="ts">
const props = defineProps<{
  legalEntityId: number
}>()

const { t } = useI18n()
const toast = useToast()

const entityIdRef = computed(() => props.legalEntityId)
const { setting, pending, error, refresh, submitting, actionError, saveKeys, createWebhook, disconnect } = useLegalEntityStripeSettings(entityIdRef)

const isUnauthorized = computed(() => {
  const status = (error.value as { statusCode?: number, status?: number } | null)?.statusCode
    ?? (error.value as { statusCode?: number, status?: number } | null)?.status
  return status === 401
})

const publishableKeyInput = ref('')
const secretKeyInput = ref('')

watch(setting, (value) => {
  publishableKeyInput.value = value?.publishable_key ?? ''
}, { immediate: true })

function statusColor(status?: string) {
  if (status === 'connected') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  return 'neutral' as const
}

async function onSave() {
  const ok = await saveKeys(publishableKeyInput.value.trim(), secretKeyInput.value.trim())
  if (ok) {
    secretKeyInput.value = ''
    toast.add({ title: t('forms.stripe.saveSuccessMessage'), color: 'success' })
  }
}

async function onCreateWebhook() {
  const ok = await createWebhook()
  if (ok) {
    toast.add({ title: t('forms.stripe.webhookSuccessMessage'), color: 'success' })
  }
}

async function onDisconnect() {
  const ok = await disconnect()
  if (ok) {
    toast.add({ title: t('forms.stripe.disconnectSuccessMessage'), color: 'success' })
  }
}
</script>

<template>
  <div
    v-if="pending"
    class="flex items-center justify-center py-12"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin text-dimmed"
    />
  </div>

  <div
    v-else-if="error"
    class="rounded-lg border border-error/30 bg-error/5 p-4"
  >
    <p class="text-sm text-error">
      {{ isUnauthorized ? t('pages.settings.authRequired') : t('pages.settings.entityLoadError') }}
    </p>
    <UButton
      v-if="isUnauthorized"
      to="/login"
      :label="t('pages.settings.signIn')"
      color="primary"
      size="sm"
      class="mt-3"
    />
    <UButton
      v-else
      :label="$t('common.retry')"
      color="neutral"
      variant="outline"
      size="sm"
      class="mt-3"
      @click="refresh()"
    />
  </div>

  <div
    v-else
    class="rounded-lg border border-default p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ t('forms.stripe.title') }}
      </p>
      <UBadge
        v-if="setting"
        :color="statusColor(setting.status)"
        variant="subtle"
        :label="t(`forms.stripe.status.${setting.status}`)"
      />
    </div>

    <p
      v-if="setting?.provider_account_id"
      class="mt-1 text-xs text-dimmed"
    >
      {{ t('forms.stripe.providerAccount', { id: setting.provider_account_id }) }}
    </p>

    <p
      v-if="setting?.credentials_unreadable"
      class="mt-1 text-xs text-error"
    >
      {{ t('forms.stripe.credentialsUnreadable') }}
    </p>
    <p
      v-else-if="setting?.secret_key_masked"
      class="mt-1 text-xs text-dimmed"
    >
      {{ t('forms.stripe.currentKey', { masked: setting.secret_key_masked }) }}
    </p>

    <p
      v-if="setting?.provider_account_mismatch"
      class="mt-2 text-sm text-warning"
    >
      {{ t('forms.stripe.providerAccountMismatch') }}
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <UFormField :label="t('forms.stripe.publishableKey')">
        <UInput
          v-model="publishableKeyInput"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('forms.stripe.secretKey')">
        <UInput
          v-model="secretKeyInput"
          type="password"
          :placeholder="setting?.has_secret_key ? t('forms.stripe.secretKeyPlaceholderExisting') : t('forms.stripe.secretKeyPlaceholderNew')"
          class="w-full"
        />
      </UFormField>
    </div>

    <p
      v-if="actionError"
      class="mt-2 text-sm text-error"
    >
      {{ actionError }}
    </p>

    <p
      v-if="setting?.status === 'error' && setting.last_error"
      class="mt-2 text-sm text-error"
    >
      {{ setting.last_error }}
    </p>

    <div class="mt-3 flex justify-end">
      <UButton
        :label="t('forms.stripe.connect')"
        color="primary"
        :loading="submitting"
        @click="onSave"
      />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-default pt-4">
      <div class="flex-1">
        <p class="text-xs uppercase tracking-wide text-dimmed">
          {{ t('forms.stripe.webhook') }}
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ setting?.webhook_configured
            ? t('forms.stripe.webhookConfigured')
            : t('forms.stripe.webhookNotConfigured') }}
        </p>
      </div>
      <UButton
        :label="t('forms.stripe.createWebhook')"
        color="neutral"
        variant="outline"
        :disabled="!setting?.has_secret_key"
        :loading="submitting"
        @click="onCreateWebhook"
      />
      <UButton
        :label="t('forms.stripe.disconnect')"
        color="error"
        variant="outline"
        :disabled="!setting?.has_secret_key"
        :loading="submitting"
        @click="onDisconnect"
      />
    </div>
  </div>
</template>
