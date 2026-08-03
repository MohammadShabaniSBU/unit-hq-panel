<script setup lang="ts">
import type { ApiDiscount } from '~/types/facility'
import type { ApiBillingSettings } from '~/types/settings'

const open = defineModel<boolean>('open', { default: false })
const discount = defineModel<ApiDiscount | null>('discount', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()
const {
  form,
  submitting,
  error,
  fieldErrors,
  alignmentWarnings,
  isEditing,
  kindOptions,
  load,
  reset,
  addTier,
  removeTier,
  submit
} = useDiscountForm()

const billing = ref<ApiBillingSettings | null>(null)

const title = computed(() =>
  isEditing.value ? t('settings.discounts.editTitle') : t('settings.discounts.createTitle')
)

const tierPreviews = computed(() => {
  if (form.kind !== 'free_time' || !billing.value) {
    return []
  }

  const interval = billing.value.default_billing_interval
  const count = Math.max(1, billing.value.default_billing_interval_count)
  const periodDays = interval === 'day' ? count : interval === 'week' ? count * 7 : count * 30

  return form.tiers.map((tier) => {
    const freeDays = Number(tier.free_weeks) * 7
    const freePeriods = periodDays > 0 ? freeDays / periodDays : 0
    return t('settings.discounts.compilePreview', {
      commitment: tier.min_commitment_weeks,
      periods: Number.isInteger(freePeriods)
        ? String(freePeriods)
        : freePeriods.toFixed(2)
    })
  })
})

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

async function loadBilling() {
  try {
    const response = await get<ApiBillingSettings>('/api/settings/billing')
    billing.value = response.data
  } catch {
    billing.value = null
  }
}

watch([open, discount], async ([isOpen, currentDiscount]) => {
  if (isOpen) {
    load(currentDiscount)
    await loadBilling()
    return
  }

  reset()
  discount.value = null
})

async function onSubmit() {
  const savedDiscount = await submit()

  if (!savedDiscount) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('settings.discounts.editSuccess')
      : t('settings.discounts.createSuccess'),
    color: 'success'
  })

  emit('saved')
  close()
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
          :label="$t('settings.discounts.name')"
          name="name"
          required
          :error="fieldError('name')"
        >
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('settings.discounts.kind')"
          name="kind"
          required
          :error="fieldError('kind')"
        >
          <USelect
            v-model="form.kind"
            :items="kindOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            :disabled="isEditing"
          />
        </UFormField>

        <template v-if="form.kind === 'percent'">
          <UFormField
            :label="$t('settings.discounts.percent')"
            name="params.percent"
            required
            :error="fieldError('params.percent')"
          >
            <UInput
              v-model="form.percent"
              type="number"
              min="0.01"
              max="99.99"
              step="0.01"
              class="w-full"
            >
              <template #trailing>
                <span class="text-sm text-dimmed">%</span>
              </template>
            </UInput>
          </UFormField>

          <UCheckbox
            v-model="form.tracks_rate_changes"
            :label="$t('settings.discounts.tracksRateChanges')"
          />
        </template>

        <template v-else>
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-highlighted">
                {{ $t('settings.discounts.tiers') }}
              </p>
              <UButton
                type="button"
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-plus"
                :label="$t('settings.discounts.addTier')"
                @click="addTier"
              />
            </div>

            <div
              v-for="(tier, index) in form.tiers"
              :key="index"
              class="rounded-lg border border-default p-3 space-y-3"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs text-dimmed">
                  {{ $t('settings.discounts.tierN', { n: index + 1 }) }}
                </p>
                <UButton
                  v-if="form.tiers.length > 1"
                  type="button"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  square
                  @click="removeTier(index)"
                />
              </div>

              <UFormField
                :label="$t('settings.discounts.minCommitmentWeeks')"
                :name="`params.tiers.${index}.min_commitment_weeks`"
                required
                :error="fieldError(`params.tiers.${index}.min_commitment_weeks`)"
              >
                <UInput
                  v-model.number="tier.min_commitment_weeks"
                  type="number"
                  min="1"
                  step="1"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.discounts.freeWeeks')"
                :name="`params.tiers.${index}.free_weeks`"
                required
                :error="fieldError(`params.tiers.${index}.free_weeks`)"
              >
                <UInput
                  v-model.number="tier.free_weeks"
                  type="number"
                  min="1"
                  step="1"
                  class="w-full"
                />
              </UFormField>

              <p
                v-if="tierPreviews[index]"
                class="text-xs text-dimmed"
              >
                {{ tierPreviews[index] }}
              </p>
            </div>

            <p
              v-if="fieldError('params.tiers')"
              class="text-sm text-error"
            >
              {{ fieldError('params.tiers') }}
            </p>
          </div>
        </template>

        <UAlert
          v-if="alignmentWarnings.length"
          color="warning"
          variant="subtle"
          :title="$t('settings.discounts.alignmentWarningTitle')"
          :description="alignmentWarnings.join(' ')"
        />

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('common.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('common.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
