<script setup lang="ts">
import type { ApiLeasingSettings } from '~/types/settings'

const props = defineProps<{
  settings: ApiLeasingSettings | null
  pending: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, load, submit } = useLeasingSettingsForm()

const timeUnitOptions = computed(() => [
  { label: t('forms.settings.timeUnitMinutes'), value: 'minutes' },
  { label: t('forms.settings.timeUnitHours'), value: 'hours' },
  { label: t('forms.settings.timeUnitDays'), value: 'days' },
  { label: t('forms.settings.timeUnitWeeks'), value: 'weeks' }
])

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
      :label="$t('forms.settings.defaultOfferExpiration')"
      name="default_offer_expiration_value"
      required
      :error="fieldError('default_offer_expiration_value') || fieldError('default_offer_expiration_unit')"
    >
      <div class="flex gap-3">
        <UInput
          v-model.number="form.default_offer_expiration_value"
          type="number"
          min="1"
          class="w-28 shrink-0"
        />
        <USelect
          v-model="form.default_offer_expiration_unit"
          :items="timeUnitOptions"
          value-key="value"
          label-key="label"
          class="min-w-0 flex-1"
        />
      </div>
    </UFormField>

    <UFormField
      :label="$t('forms.settings.defaultReservationExpiration')"
      name="default_reservation_expiration_value"
      required
      :error="fieldError('default_reservation_expiration_value') || fieldError('default_reservation_expiration_unit')"
    >
      <div class="flex gap-3">
        <UInput
          v-model.number="form.default_reservation_expiration_value"
          type="number"
          min="1"
          class="w-28 shrink-0"
        />
        <USelect
          v-model="form.default_reservation_expiration_unit"
          :items="timeUnitOptions"
          value-key="value"
          label-key="label"
          class="min-w-0 flex-1"
        />
      </div>
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
