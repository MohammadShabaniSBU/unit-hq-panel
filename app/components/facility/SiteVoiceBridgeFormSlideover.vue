<script setup lang="ts">
import type { ApiVoiceBridgeToken } from '~/types/voiceBridgeToken'
import { E164_PHONE } from '~/composables/useSiteVoiceBridgeTokenForm'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  siteId: number
  editing: ApiVoiceBridgeToken | null
}>()

const emit = defineEmits<{
  saved: [token: ApiVoiceBridgeToken]
}>()

const { t } = useI18n()

const siteIdRef = computed(() => props.siteId)
const { form, submitting, error, fieldErrors, reset, load, submit } = useSiteVoiceBridgeTokenForm(siteIdRef)

const isEdit = computed(() => props.editing != null)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

function validateClient(): boolean {
  const next: Record<string, Array<string>> = {}

  if (!E164_PHONE.test(form.phone_number.trim())) {
    next.phone_number = [t('facility.voiceBridgeTokens.e164Error')]
  }

  const optional: Array<keyof typeof form> = ['main_line_number', 'voicemail_number']
  for (const field of optional) {
    const value = form[field].trim()
    if (value !== '' && !E164_PHONE.test(value)) {
      next[field] = [t('facility.voiceBridgeTokens.e164Error')]
    }
  }

  fieldErrors.value = next
  return Object.keys(next).length === 0
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
    return
  }

  if (props.editing) {
    load(props.editing)
    return
  }

  reset()
})

async function onSubmit() {
  if (!validateClient()) {
    return
  }

  const saved = await submit()

  if (!saved) {
    return
  }

  emit('saved', saved)
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="isEdit
      ? $t('facility.voiceBridgeTokens.editTitle')
      : $t('facility.voiceBridgeTokens.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('facility.voiceBridgeTokens.phoneNumber')"
          name="phone_number"
          required
          :hint="$t('facility.voiceBridgeTokens.e164Hint')"
          :error="fieldError('phone_number')"
        >
          <UInput
            v-model="form.phone_number"
            class="w-full"
            placeholder="+15551234567"
          />
        </UFormField>

        <UFormField
          :label="$t('facility.voiceBridgeTokens.mainLine')"
          name="main_line_number"
          :hint="$t('facility.voiceBridgeTokens.e164Hint')"
          :error="fieldError('main_line_number')"
        >
          <UInput
            v-model="form.main_line_number"
            class="w-full"
            placeholder="+15557654321"
          />
        </UFormField>

        <UFormField
          :label="$t('facility.voiceBridgeTokens.voicemail')"
          name="voicemail_number"
          :hint="$t('facility.voiceBridgeTokens.e164Hint')"
          :error="fieldError('voicemail_number')"
        >
          <UInput
            v-model="form.voicemail_number"
            class="w-full"
            placeholder="+15550001111"
          />
        </UFormField>

        <UFormField
          :label="$t('facility.voiceBridgeTokens.label')"
          name="label"
          :error="fieldError('label')"
        >
          <UInput
            v-model="form.label"
            class="w-full"
          />
        </UFormField>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="close"
        />
        <UButton
          :label="isEdit
            ? $t('facility.voiceBridgeTokens.save')
            : $t('facility.voiceBridgeTokens.create')"
          color="primary"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
