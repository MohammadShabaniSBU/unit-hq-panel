<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { ApiTaxRate } from '~/types/tax-rate'

const open = defineModel<boolean>('open', { default: false })
const taxRate = defineModel<ApiTaxRate | null>('taxRate', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, isEditing, load, reset, submit } = useTaxRateForm()
const { items: countryItems } = useOptions('/api/countries/options')

const title = computed(() =>
  isEditing.value ? t('forms.taxRate.editTitle') : t('forms.taxRate.createTitle')
)

const jurisdictionItems = computed(() => [
  {
    value: '',
    title: t('pages.settings.taxRates.jurisdiction.universal')
  },
  ...countryItems.value
    .map((country) => {
      const option = country as { code?: string, title?: string, label?: string }
      return {
        value: option.code ?? '',
        title: option.title ?? option.label ?? option.code ?? ''
      }
    })
    .filter(item => item.value !== '')
])

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

function parseIsoDate(value: string): CalendarDate | null {
  if (!value.trim()) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new CalendarDate(year, month, day)
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  return `${value.year}-${m}-${d}`
}

const effectiveFrom = computed({
  get: () => parseIsoDate(form.effective_from),
  set: (value: CalendarDate | null) => { form.effective_from = formatIsoDate(value) }
})

const effectiveFromInput = useTemplateRef('effectiveFromInput')

watch([open, taxRate], ([isOpen, currentTaxRate]) => {
  if (isOpen) {
    load(currentTaxRate)
    return
  }

  reset()
  taxRate.value = null
})

async function onSubmit() {
  const savedTaxRate = await submit()

  if (!savedTaxRate) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.taxRate.editSuccessMessage')
      : t('forms.taxRate.createSuccessMessage'),
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
        <p
          v-if="isEditing"
          class="text-xs text-dimmed"
        >
          {{ $t('forms.taxRate.editHint') }}
        </p>

        <UFormField
          :label="$t('forms.taxRate.name')"
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
          :label="$t('forms.taxRate.code')"
          name="code"
          required
          :error="fieldError('code')"
        >
          <UInput
            v-model="form.code"
            :disabled="isEditing"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('forms.taxRate.rate')"
            name="rate"
            required
            :error="fieldError('rate')"
          >
            <UInput
              v-model="form.rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.taxRate.jurisdiction')"
            name="jurisdiction"
            :description="$t('pages.settings.taxRates.jurisdiction.hint')"
            :error="fieldError('jurisdiction')"
          >
            <USelect
              v-model="form.jurisdiction"
              :items="jurisdictionItems"
              value-key="value"
              label-key="title"
              :placeholder="$t('pages.settings.taxRates.jurisdiction.universal')"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('forms.taxRate.effectiveFrom')"
          name="effective_from"
          :error="fieldError('effective_from')"
        >
          <UInputDate
            ref="effectiveFromInput"
            v-model="effectiveFrom"
            class="w-full"
          >
            <template #trailing>
              <UPopover :reference="effectiveFromInput?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="$t('forms.taxRate.effectiveFrom')"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="effectiveFrom"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>

        <UFormField
          v-if="!isEditing"
          name="is_default"
          :error="fieldError('is_default')"
        >
          <UCheckbox
            v-model="form.is_default"
            :label="$t('forms.taxRate.isDefault')"
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

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('forms.taxRate.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.taxRate.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
