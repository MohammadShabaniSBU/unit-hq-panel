<script setup lang="ts">
import type { ApiBillingSettings } from '~/types/settings'

const props = defineProps<{
  settings: ApiBillingSettings | null
  pending: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, load, submit } = useBillingSettingsForm()

const currencyOptions = [
  { label: 'GBP', value: 'GBP' },
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' }
]

const intervalOptions = computed(() => [
  { label: t('forms.settings.intervalDay'), value: 'day' },
  { label: t('forms.settings.intervalWeek'), value: 'week' },
  { label: t('forms.settings.intervalMonth'), value: 'month' }
])

const anchorModelOptions = computed(() => [
  { label: t('forms.settings.anchorModelAnniversary'), value: 'anniversary' },
  { label: t('forms.settings.anchorModelCalendar'), value: 'calendar' }
])

const prorationMethodOptions = computed(() => [
  { label: t('forms.settings.prorationDaily'), value: 'daily' },
  { label: t('forms.settings.prorationFullPeriod'), value: 'full_period' },
  { label: t('forms.settings.prorationNone'), value: 'none' }
])

const isCalendarAnchor = computed(() => form.billing_anchor_model === 'calendar')

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

watch(
  () => form.billing_anchor_model,
  (model) => {
    if (model === 'calendar') {
      form.default_billing_interval = 'month'
    }
  }
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
      :label="$t('forms.settings.defaultCurrency')"
      name="default_currency"
      required
      :error="fieldError('default_currency')"
    >
      <USelect
        v-model="form.default_currency"
        :items="currencyOptions"
        value-key="value"
        label-key="label"
        :placeholder="$t('forms.settings.defaultCurrency')"
        class="w-full"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        :label="$t('forms.settings.billingInterval')"
        name="default_billing_interval"
        required
        :error="fieldError('default_billing_interval')"
      >
        <USelect
          v-model="form.default_billing_interval"
          :items="intervalOptions"
          value-key="value"
          label-key="label"
          :disabled="isCalendarAnchor"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="$t('forms.settings.billingIntervalCount')"
        name="default_billing_interval_count"
        required
        :error="fieldError('default_billing_interval_count')"
      >
        <UInput
          v-model.number="form.default_billing_interval_count"
          type="number"
          min="1"
          step="1"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        :label="$t('forms.settings.billingAnchorModel')"
        name="billing_anchor_model"
        required
        :error="fieldError('billing_anchor_model')"
      >
        <USelect
          v-model="form.billing_anchor_model"
          :items="anchorModelOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>

      <UFormField
        v-if="isCalendarAnchor"
        :label="$t('forms.settings.billingAnchorDay')"
        name="billing_anchor_day"
        required
        :error="fieldError('billing_anchor_day')"
      >
        <UInput
          v-model.number="form.billing_anchor_day"
          type="number"
          min="1"
          max="28"
          step="1"
          class="w-full"
        />
      </UFormField>
    </div>

    <p
      v-if="isCalendarAnchor"
      class="text-xs text-dimmed"
    >
      {{ $t('forms.settings.calendarRequiresMonthly') }}
    </p>

    <UFormField
      :label="$t('forms.settings.prorationMethod')"
      name="proration_method"
      required
      :error="fieldError('proration_method')"
    >
      <USelect
        v-model="form.proration_method"
        :items="prorationMethodOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('forms.settings.defaultDepositAmount')"
      name="default_deposit_amount"
      required
      :error="fieldError('default_deposit_amount')"
    >
      <UInput
        v-model="form.default_deposit_amount"
        type="number"
        min="0"
        step="0.01"
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
