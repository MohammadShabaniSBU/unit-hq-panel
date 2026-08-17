<script setup lang="ts">
import type { AnalyticsAccount, AnalyticsProviderDescriptor } from '~/types/insights'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  account: AnalyticsAccount | null
  providers: Array<AnalyticsProviderDescriptor>
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { create, update, submitting, actionError } = useAnalyticsAccounts()

const provider = ref('')
const displayName = ref('')
const baseUrl = ref('')
const privateBaseUrl = ref('')
const isDefault = ref(false)
const credentialInputs = reactive<Record<string, string>>({})

const isEditing = computed(() => props.account != null)
const isMetabase = computed(() => provider.value === 'metabase')

const title = computed(() =>
  isEditing.value
    ? t('settings.insights.connections.editTitle')
    : t('settings.insights.connections.createTitle')
)

const selectedProvider = computed(() =>
  props.providers.find(row => row.key === provider.value) ?? null
)

const providerItems = computed(() =>
  props.providers.map(row => ({
    label: row.label,
    value: row.key
  }))
)

const showIframeHelp = computed(() => provider.value === 'iframe')

watch([open, () => props.account], () => {
  if (!open.value) {
    return
  }

  if (props.account) {
    provider.value = props.account.provider
    displayName.value = props.account.display_name
    baseUrl.value = props.account.base_url
    privateBaseUrl.value = props.account.private_base_url ?? ''
    isDefault.value = props.account.is_default
  } else {
    provider.value = props.providers[0]?.key ?? ''
    displayName.value = ''
    baseUrl.value = ''
    privateBaseUrl.value = ''
    isDefault.value = false
  }

  syncCredentialKeys()
  for (const key of Object.keys(credentialInputs)) {
    credentialInputs[key] = ''
  }
}, { immediate: true })

watch(provider, () => {
  if (!isEditing.value) {
    syncCredentialKeys()
  }
})

function syncCredentialKeys() {
  const fields = selectedProvider.value?.credential_fields ?? {}
  const next: Record<string, string> = {}
  for (const key of Object.keys(fields)) {
    next[key] = credentialInputs[key] ?? ''
  }
  for (const key of Object.keys(credentialInputs)) {
    if (!(key in next)) {
      credentialInputs[key] = ''
    }
  }
  for (const [key, value] of Object.entries(next)) {
    credentialInputs[key] = value
  }
}

async function onSubmit() {
  if (!provider.value || !displayName.value || !baseUrl.value) {
    return
  }

  if (isMetabase.value && !privateBaseUrl.value) {
    return
  }

  const credentials: Record<string, string> = {}
  for (const key of Object.keys(selectedProvider.value?.credential_fields ?? {})) {
    credentials[key] = credentialInputs[key] ?? ''
  }

  const payload = {
    display_name: displayName.value,
    base_url: baseUrl.value,
    private_base_url: isMetabase.value ? privateBaseUrl.value : null,
    credentials,
    is_default: isDefault.value
  }

  let saved: AnalyticsAccount | null = null

  if (props.account) {
    saved = await update(props.account.id, payload)
  } else {
    saved = await create({
      provider: provider.value,
      ...payload
    })
  }

  if (saved) {
    toast.add({ title: t('settings.insights.connections.saveSuccess'), color: 'success' })
    open.value = false
    emit('saved')
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="title"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('settings.insights.connections.provider')"
          required
        >
          <USelect
            v-model="provider"
            :items="providerItems"
            value-key="value"
            class="w-full"
            :disabled="isEditing"
          />
        </UFormField>

        <UFormField
          :label="t('settings.insights.connections.displayName')"
          required
        >
          <UInput
            v-model="displayName"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="isMetabase"
          :label="t('settings.insights.connections.publicBaseUrl')"
          required
          :hint="t('settings.insights.connections.publicBaseUrlHelp')"
        >
          <UInput
            v-model="baseUrl"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="isMetabase"
          :label="t('settings.insights.connections.privateBaseUrl')"
          required
          :hint="t('settings.insights.connections.privateBaseUrlHelp')"
        >
          <UInput
            v-model="privateBaseUrl"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="!isMetabase"
          :label="t('settings.insights.connections.baseUrl')"
          required
          :hint="t('settings.insights.connections.baseUrlHelp')"
        >
          <UInput
            v-model="baseUrl"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="account?.credentials_unreadable"
          color="error"
          variant="subtle"
          :title="t('settings.insights.connections.credentialsUnreadable')"
        />

        <div
          v-if="selectedProvider && Object.keys(selectedProvider.credential_fields).length > 0"
          class="grid gap-3"
        >
          <UFormField
            v-for="(field, key) in selectedProvider.credential_fields"
            :key="String(key)"
            :label="field.label"
          >
            <UInput
              v-model="credentialInputs[String(key)]"
              :type="field.secret ? 'password' : 'text'"
              :placeholder="account?.credentials[String(key)]?.has_value
                ? t('settings.insights.connections.credentialPlaceholderExisting')
                : t('settings.insights.connections.credentialPlaceholderNew')"
              class="w-full"
            />
            <p
              v-if="account?.credentials[String(key)]?.masked && !account.credentials_unreadable"
              class="mt-1 text-xs text-dimmed"
            >
              {{ t('settings.insights.connections.currentKey', {
                masked: account?.credentials[String(key)]?.masked ?? ''
              }) }}
            </p>
          </UFormField>
        </div>

        <UCheckbox
          v-model="isDefault"
          :label="t('settings.insights.connections.default')"
        />

        <p
          v-if="showIframeHelp"
          class="text-xs text-dimmed"
        >
          {{ t('settings.insights.connections.iframeAuthHelp') }}
        </p>

        <p
          v-if="actionError"
          class="text-sm text-error"
        >
          {{ actionError }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('settings.insights.reports.cancel')"
          @click="open = false"
        />
        <UButton
          color="primary"
          :label="t('settings.insights.connections.save')"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
