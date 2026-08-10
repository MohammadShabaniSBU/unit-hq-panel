<script setup lang="ts">
import type { AiProviderAccount, AiProviderDescriptor } from '~/types/ai'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  account: AiProviderAccount | null
  providers: Array<AiProviderDescriptor>
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { create, update, verify, submitting, actionError } = useAiProviderAccounts()

const provider = ref('')
const displayName = ref('')
const isDefault = ref(false)
const credentialInputs = reactive<Record<string, string>>({})
const availableOptions = ref<Array<string>>([])
const selectedModels = ref<Array<string>>([])
const defaultModel = ref<string | undefined>(undefined)
const verifying = ref(false)

const isEditing = computed(() => props.account != null)

const title = computed(() =>
  isEditing.value
    ? t('settings.ai.connections.editTitle')
    : t('settings.ai.connections.createTitle')
)

const selectedProvider = computed(() =>
  props.providers.find(row => row.key === provider.value) ?? null
)

const providerItems = computed(() =>
  props.providers.map(row => ({ label: row.label, value: row.key }))
)

const modelItems = computed(() =>
  availableOptions.value.map(id => ({ label: id, value: id }))
)

const defaultModelItems = computed(() =>
  selectedModels.value.map(id => ({ label: id, value: id }))
)

watch([open, () => props.account], () => {
  if (!open.value) {
    return
  }

  if (props.account) {
    provider.value = props.account.provider
    displayName.value = props.account.display_name
    isDefault.value = props.account.is_default
    availableOptions.value = [...props.account.allowed_models]
    selectedModels.value = [...props.account.allowed_models]
    defaultModel.value = props.account.default_model ?? undefined
  } else {
    provider.value = props.providers[0]?.key ?? ''
    displayName.value = ''
    isDefault.value = false
    availableOptions.value = []
    selectedModels.value = []
    defaultModel.value = undefined
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

watch(selectedModels, (models) => {
  if (defaultModel.value && !models.includes(defaultModel.value)) {
    defaultModel.value = models[0]
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

async function onRefreshModels() {
  if (!props.account) {
    return
  }
  verifying.value = true
  try {
    const result = await verify(props.account.id)
    if (result?.available_models) {
      availableOptions.value = [...new Set([...availableOptions.value, ...result.available_models])]
    }
  } finally {
    verifying.value = false
  }
}

async function onSubmit() {
  if (!provider.value || !displayName.value) {
    return
  }

  const credentials: Record<string, string> = {}
  for (const key of Object.keys(selectedProvider.value?.credential_fields ?? {})) {
    credentials[key] = credentialInputs[key] ?? ''
  }

  const saved = props.account
    ? await update(props.account.id, {
        display_name: displayName.value,
        credentials,
        allowed_models: selectedModels.value,
        default_model: defaultModel.value
      })
    : await create({
        provider: provider.value,
        display_name: displayName.value,
        credentials,
        is_default: isDefault.value
      })

  if (saved) {
    toast.add({ title: t('settings.ai.connections.saveSuccess'), color: 'success' })
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
          :label="t('settings.ai.connections.provider')"
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
          :label="t('settings.ai.connections.displayName')"
          required
        >
          <UInput
            v-model="displayName"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="account?.credentials_unreadable"
          color="error"
          variant="subtle"
          :title="t('settings.ai.connections.credentialsUnreadable')"
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
                ? t('settings.ai.connections.credentialPlaceholderExisting')
                : t('settings.ai.connections.credentialPlaceholderNew')"
              class="w-full"
            />
            <p
              v-if="account?.credentials[String(key)]?.masked && !account.credentials_unreadable"
              class="mt-1 text-xs text-dimmed"
            >
              {{ t('settings.ai.connections.currentKey', {
                masked: account?.credentials[String(key)]?.masked ?? ''
              }) }}
            </p>
          </UFormField>
        </div>

        <UCheckbox
          v-if="!isEditing"
          v-model="isDefault"
          :label="t('settings.ai.connections.default')"
        />

        <template v-if="isEditing">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-highlighted">
              {{ t('settings.ai.connections.allowedModels') }}
            </p>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-refresh-cw"
              :label="t('settings.ai.connections.refreshModels')"
              :loading="verifying"
              @click="onRefreshModels"
            />
          </div>

          <p
            v-if="availableOptions.length === 0"
            class="text-xs text-dimmed"
          >
            {{ t('settings.ai.connections.noModelsYet') }}
          </p>

          <UCheckboxGroup
            v-else
            v-model="selectedModels"
            :items="modelItems"
            value-key="value"
            label-key="label"
          />

          <UFormField
            v-if="selectedModels.length > 0"
            :label="t('settings.ai.connections.defaultModel')"
            :hint="t('settings.ai.connections.defaultModelHelp')"
          >
            <USelect
              v-model="defaultModel"
              :items="defaultModelItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </template>

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
          :label="t('settings.ai.connections.cancel')"
          @click="open = false"
        />
        <UButton
          color="primary"
          :label="t('settings.ai.connections.save')"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
