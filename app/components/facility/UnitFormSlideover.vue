<script setup lang="ts">
import type { ApiUnit } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const unit = defineModel<ApiUnit | null>('unit', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, isEditing, load, reset, submit } = useUnitForm()

const { items: siteItems } = useOptions('/api/sites/options')
const { items: unitClassItems } = useOptions('/api/unit-classes/options')

const title = computed(() =>
  isEditing.value ? t('forms.unit.editTitle') : t('forms.unit.createTitle')
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, unit], ([isOpen, currentUnit]) => {
  if (isOpen) {
    load(currentUnit)
    return
  }

  reset()
  unit.value = null
})

async function onSubmit() {
  const savedUnit = await submit()

  if (!savedUnit) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.unit.editSuccessMessage')
      : t('forms.unit.createSuccessMessage'),
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
          :label="$t('forms.unit.site')"
          name="site_id"
          required
          :error="fieldError('site_id')"
        >
          <USelect
            v-model="form.site_id"
            :items="siteItems"
            value-key="value"
            label-key="title"
            :placeholder="$t('forms.unit.site')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.unit.unitClass')"
          name="unit_class_id"
          required
          :error="fieldError('unit_class_id')"
        >
          <USelect
            v-model="form.unit_class_id"
            :items="unitClassItems"
            value-key="value"
            label-key="title"
            :placeholder="$t('forms.unit.unitClass')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.unit.unitNumber')"
          name="unit_number"
          required
          :error="fieldError('unit_number')"
        >
          <UInput
            v-model="form.unit_number"
            class="w-full"
          />
        </UFormField>

        <fieldset class="space-y-3">
          <legend class="text-sm font-medium text-highlighted">
            {{ $t('forms.unit.dimensions') }}
          </legend>

          <div class="grid grid-cols-3 gap-3">
            <UFormField
              :label="$t('forms.unit.width')"
              name="actual_width"
              :error="fieldError('actual_width')"
            >
              <UInput
                v-model.number="form.actual_width"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('forms.unit.depth')"
              name="actual_depth"
              :error="fieldError('actual_depth')"
            >
              <UInput
                v-model.number="form.actual_depth"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('forms.unit.height')"
              name="actual_height"
              :error="fieldError('actual_height')"
            >
              <UInput
                v-model.number="form.actual_height"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
          </div>
        </fieldset>

        <UFormField
          :label="$t('forms.unit.note')"
          name="note"
          :error="fieldError('note')"
        >
          <UTextarea
            v-model="form.note"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.unit.enabled')"
          name="enabled"
          :error="fieldError('enabled')"
        >
          <USwitch v-model="form.enabled" />
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
            :label="$t('forms.unit.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.unit.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
