<script setup lang="ts">
import type { ApiInsurancePlan } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const plan = defineModel<ApiInsurancePlan | null>('plan', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, isEditing, load, reset, submit } = useInsurancePlanForm()

const title = computed(() =>
  isEditing.value ? t('forms.insurancePlan.editTitle') : t('forms.insurancePlan.createTitle')
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, plan], ([isOpen, currentPlan]) => {
  if (isOpen) {
    load(currentPlan)
    return
  }

  reset()
  plan.value = null
})

async function onSubmit() {
  const savedPlan = await submit()

  if (!savedPlan) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.insurancePlan.editSuccessMessage')
      : t('forms.insurancePlan.createSuccessMessage'),
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
          :label="$t('forms.insurancePlan.name')"
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
          :label="$t('forms.insurancePlan.description')"
          name="description"
          :error="fieldError('description')"
        >
          <UTextarea
            v-model="form.description"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.insurancePlan.coverage')"
          name="coverage"
          required
          :error="fieldError('coverage')"
        >
          <UInput
            v-model.number="form.coverage"
            type="number"
            min="0"
            step="0.01"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.insurancePlan.currency')"
          name="currency"
          required
          :error="fieldError('currency')"
        >
          <UInput
            v-model="form.currency"
            maxlength="3"
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
            :label="$t('forms.insurancePlan.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.insurancePlan.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
