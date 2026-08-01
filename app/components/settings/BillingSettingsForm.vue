<script setup lang="ts">
import type { ApiBillingSettings } from '~/types/settings'
import type { BillingAnchorModel } from '~/types/contract'

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
  { label: t('forms.settings.anchorModelCalendar'), value: 'calendar' },
  { label: t('forms.settings.anchorModelCalendarWeek'), value: 'calendar_week' }
])

const weekdayOptions = computed(() => [
  { label: t('forms.settings.weekdayMonday'), value: 1 },
  { label: t('forms.settings.weekdayTuesday'), value: 2 },
  { label: t('forms.settings.weekdayWednesday'), value: 3 },
  { label: t('forms.settings.weekdayThursday'), value: 4 },
  { label: t('forms.settings.weekdayFriday'), value: 5 },
  { label: t('forms.settings.weekdaySaturday'), value: 6 },
  { label: t('forms.settings.weekdaySunday'), value: 7 }
])

const prorationMethodOptions = computed(() => [
  { label: t('forms.settings.prorationDaily'), value: 'daily' },
  { label: t('forms.settings.prorationFullPeriod'), value: 'full_period' },
  { label: t('forms.settings.prorationNone'), value: 'none' }
])

const isCalendarMonthAnchor = computed(() => form.billing_anchor_model === 'calendar')
const isCalendarWeekAnchor = computed(() => form.billing_anchor_model === 'calendar_week')
const locksInterval = computed(() => isCalendarMonthAnchor.value || isCalendarWeekAnchor.value)

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
  (model: BillingAnchorModel, previous: BillingAnchorModel | undefined) => {
    if (model === 'calendar') {
      form.default_billing_interval = 'month'
      if (previous === 'calendar_week' || form.billing_anchor_day > 28) {
        form.billing_anchor_day = 1
      }
      return
    }

    if (model === 'calendar_week') {
      form.default_billing_interval = 'week'
      if (previous === 'calendar' || form.billing_anchor_day < 1 || form.billing_anchor_day > 7) {
        form.billing_anchor_day = 1
      }
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
          :disabled="locksInterval"
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
        v-if="isCalendarMonthAnchor"
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

      <UFormField
        v-else-if="isCalendarWeekAnchor"
        :label="$t('forms.settings.billingAnchorWeekday')"
        name="billing_anchor_day"
        required
        :error="fieldError('billing_anchor_day')"
      >
        <USelect
          v-model="form.billing_anchor_day"
          :items="weekdayOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
    </div>

    <p
      v-if="isCalendarMonthAnchor"
      class="text-xs text-dimmed"
    >
      {{ $t('forms.settings.calendarRequiresMonthly') }}
    </p>
    <p
      v-else-if="isCalendarWeekAnchor"
      class="text-xs text-dimmed"
    >
      {{ $t('forms.settings.calendarRequiresWeekly') }}
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

    <UFormField
      :label="$t('forms.settings.billingHorizonDays')"
      name="billing_horizon_days"
      required
      :error="fieldError('billing_horizon_days')"
      :hint="$t('forms.settings.billingHorizonDaysHelp')"
    >
      <UInput
        v-model.number="form.billing_horizon_days"
        type="number"
        min="0"
        max="365"
        step="1"
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
