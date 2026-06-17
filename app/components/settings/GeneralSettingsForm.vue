<script setup lang="ts">
import type { ApiGeneralSettings } from '~/types/settings'

const props = defineProps<{
  settings: ApiGeneralSettings | null
  pending: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, load, submit } = useGeneralSettingsForm()

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

watch(
  () => props.settings,
  (settings) => {
    if (settings) {
      load(settings)
    }
  },
  { immediate: true }
)

async function onSubmit() {
  const savedSettings = await submit()

  if (!savedSettings) {
    return
  }

  load(savedSettings)

  toast.add({
    title: t('forms.settings.saveSuccessMessage'),
    color: 'success'
  })
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

  <form
    v-else
    class="flex flex-col gap-5"
    @submit.prevent="onSubmit"
  >
    <UFormField
      :label="$t('forms.settings.companyName')"
      name="company_name"
      required
      :error="fieldError('company_name')"
    >
      <UInput
        v-model="form.company_name"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('forms.settings.companyContactEmail')"
      name="company_contact_email"
      required
      :error="fieldError('company_contact_email')"
    >
      <UInput
        v-model="form.company_contact_email"
        type="email"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('forms.settings.phone')"
      name="phone"
      required
      :error="fieldError('phone')"
    >
      <UInput
        v-model="form.phone"
        type="tel"
        class="w-full"
      />
    </UFormField>

    <div
      v-if="error && !Object.keys(fieldErrors).length"
      class="rounded-lg border border-error/30 bg-error/5 p-3"
    >
      <p class="text-sm text-error">
        {{ error }}
      </p>
    </div>

    <div class="flex justify-end border-t border-default pt-5">
      <UButton
        type="submit"
        :label="$t('forms.settings.save')"
        color="primary"
        :loading="submitting"
      />
    </div>
  </form>
</template>
