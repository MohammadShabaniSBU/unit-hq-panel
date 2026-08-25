<script setup lang="ts">
import type { ApiSizeGuide } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const guide = defineModel<ApiSizeGuide | null>('guide', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { items: siteItems } = useOptions('/api/sites/options')
const { items: unitClassItems } = useOptions('/api/unit-classes/options')
const {
  form,
  submitting,
  error,
  fieldErrors,
  isEditing,
  metricOptions,
  load,
  reset,
  submit
} = useSizeGuideForm()

const title = computed(() =>
  isEditing.value ? t('facility.size_guides.editTitle') : t('facility.size_guides.createTitle')
)

const siteSelectItems = computed(() => [
  { value: '', label: t('facility.size_guides.companyDefault') },
  ...siteItems.value.map(site => ({ value: site.value, label: site.label }))
])

const classSelectItems = computed(() => [
  { value: '', label: t('facility.size_guides.sizeBand') },
  ...unitClassItems.value.map(item => ({ value: item.value, label: item.label }))
])

const isSizeBand = computed(() => form.unit_class_id === '')

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, guide], ([isOpen, current]) => {
  if (isOpen) {
    load(current)
    return
  }

  reset()
  guide.value = null
})

async function onSubmit() {
  const saved = await submit()
  if (!saved) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('facility.size_guides.editSuccess')
      : t('facility.size_guides.createSuccess'),
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
          :label="$t('facility.size_guides.metric')"
          name="metric"
          required
          :error="fieldError('metric')"
        >
          <USelect
            v-model="form.metric"
            :items="metricOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('facility.size_guides.site')"
          name="site_id"
          :error="fieldError('site_id')"
        >
          <USelect
            v-model="form.site_id"
            :items="siteSelectItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('facility.size_guides.unitClass')"
          name="unit_class_id"
          :error="fieldError('unit_class_id')"
        >
          <USelect
            v-model="form.unit_class_id"
            :items="classSelectItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('facility.size_guides.minQuantity')"
            name="min_quantity"
            :error="fieldError('min_quantity')"
          >
            <UInput
              v-model="form.min_quantity"
              type="number"
              min="0"
              step="1"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="$t('facility.size_guides.maxQuantity')"
            name="max_quantity"
            :error="fieldError('max_quantity')"
          >
            <UInput
              v-model="form.max_quantity"
              type="number"
              min="0"
              step="1"
              class="w-full"
            />
          </UFormField>
        </div>

        <div
          v-if="isSizeBand"
          class="grid grid-cols-2 gap-3"
        >
          <UFormField
            :label="$t('facility.size_guides.minSize')"
            name="min_size"
            :error="fieldError('min_size')"
          >
            <UInput
              v-model="form.min_size"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="$t('facility.size_guides.maxSize')"
            name="max_size"
            :error="fieldError('max_size')"
          >
            <UInput
              v-model="form.max_size"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('facility.size_guides.notes')"
          name="notes"
          :error="fieldError('notes')"
        >
          <UTextarea
            v-model="form.notes"
            class="w-full"
            :rows="3"
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
