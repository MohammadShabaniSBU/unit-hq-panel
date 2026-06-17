<script setup lang="ts">
import type { ApiUnitClass } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const unitClass = defineModel<ApiUnitClass | null>('unitClass', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, isEditing, load, reset, submit } = useUnitClassForm()

const title = computed(() =>
  isEditing.value ? t('forms.unitClass.editTitle') : t('forms.unitClass.createTitle')
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, unitClass], ([isOpen, currentUnitClass]) => {
  if (isOpen) {
    load(currentUnitClass)
    return
  }

  reset()
  unitClass.value = null
})

async function onSubmit() {
  const savedUnitClass = await submit()

  if (!savedUnitClass) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.unitClass.editSuccessMessage')
      : t('forms.unitClass.createSuccessMessage'),
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
          :label="$t('forms.unitClass.code')"
          name="code"
          required
          :error="fieldError('code')"
        >
          <UInput
            v-model="form.code"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.unitClass.label')"
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
          :label="$t('forms.unitClass.size')"
          name="size"
          :error="fieldError('size')"
        >
          <UInput
            v-model.number="form.size"
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

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('forms.unitClass.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.unitClass.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
