<script setup lang="ts">
import type { ApiDiscount } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const discount = defineModel<ApiDiscount | null>('discount', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const {
  form,
  submitting,
  error,
  fieldErrors,
  isEditing,
  discountTypeOptions,
  load,
  reset,
  submit
} = useDiscountForm()

const title = computed(() =>
  isEditing.value ? t('forms.discount.editTitle') : t('forms.discount.createTitle')
)

const valueSuffix = computed(() =>
  form.discount_type === 'percentage' ? '%' : undefined
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, discount], ([isOpen, currentDiscount]) => {
  if (isOpen) {
    load(currentDiscount)
    return
  }

  reset()
  discount.value = null
})

watch(() => form.durationForever, (forever) => {
  if (forever) {
    form.duration_months = undefined
  }
})

async function onSubmit() {
  const savedDiscount = await submit()

  if (!savedDiscount) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.discount.editSuccessMessage')
      : t('forms.discount.createSuccessMessage'),
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
          :label="$t('forms.discount.code')"
          name="code"
          :error="fieldError('code')"
        >
          <UInput
            v-model="form.code"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.discount.label')"
          name="label"
          required
          :error="fieldError('label')"
        >
          <UInput
            v-model="form.label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.discount.discountType')"
          name="discount_type"
          required
          :error="fieldError('discount_type')"
        >
          <USelect
            v-model="form.discount_type"
            :items="discountTypeOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.discount.value')"
          name="value"
          required
          :error="fieldError('value')"
        >
          <UInput
            v-model.number="form.value"
            type="number"
            min="0"
            :max="form.discount_type === 'percentage' ? 100 : undefined"
            step="0.01"
            class="w-full"
          >
            <template
              v-if="valueSuffix"
              #trailing
            >
              <span class="text-sm text-dimmed">{{ valueSuffix }}</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="$t('forms.discount.duration')"
          name="duration_months"
          :error="fieldError('duration_months')"
        >
          <div class="flex flex-col gap-3">
            <UCheckbox
              v-model="form.durationForever"
              :label="$t('forms.discount.durationForever')"
            />

            <UInput
              v-if="!form.durationForever"
              v-model.number="form.duration_months"
              type="number"
              min="1"
              step="1"
              class="w-full"
              :placeholder="$t('forms.discount.durationMonthsPlaceholder')"
            />
          </div>
        </UFormField>

        <UFormField
          :label="$t('forms.discount.effectiveFrom')"
          name="effective_from"
          :error="fieldError('effective_from')"
        >
          <UInput
            v-model="form.effective_from"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.discount.effectiveTo')"
          name="effective_to"
          :error="fieldError('effective_to')"
        >
          <UInput
            v-model="form.effective_to"
            type="date"
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

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('forms.discount.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.discount.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
