<script setup lang="ts">
import type { InvoiceSeriesKind } from '~/types/invoiceSeries'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  entityId: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const entityIdRef = computed(() => props.entityId)
const { form, submitting, error, fieldErrors, reset, submit } = useInvoiceSeriesForm(entityIdRef)

const kindItems = computed(() => ([
  { value: 'ordinary' as InvoiceSeriesKind, label: t('settings.invoiceSeries.kinds.ordinary') },
  { value: 'simplified' as InvoiceSeriesKind, label: t('settings.invoiceSeries.kinds.simplified') },
  { value: 'rectificative' as InvoiceSeriesKind, label: t('settings.invoiceSeries.kinds.rectificative') }
]))

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    reset()
    return
  }

  reset()
})

async function onSubmit() {
  const saved = await submit()

  if (!saved) {
    return
  }

  toast.add({
    title: t('settings.invoiceSeries.createSuccess'),
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
    :title="$t('settings.invoiceSeries.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('settings.invoiceSeries.code')"
          name="code"
          required
          :error="fieldError('code')"
        >
          <UInput
            v-model="form.code"
            class="w-full"
            maxlength="20"
            placeholder="F2026"
          />
        </UFormField>

        <UFormField
          :label="$t('settings.invoiceSeries.kind')"
          name="kind"
          required
          :error="fieldError('kind')"
        >
          <USelect
            v-model="form.kind"
            :items="kindItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('settings.invoiceSeries.startingNumber')"
          name="starting_number"
          :hint="$t('settings.invoiceSeries.startingNumberHint')"
          :error="fieldError('starting_number') || fieldError('next_number')"
        >
          <UInput
            v-model.number="form.starting_number"
            type="number"
            :min="1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('settings.invoiceSeries.isDefault')"
          name="is_default"
          :error="fieldError('is_default')"
        >
          <UCheckbox
            v-model="form.is_default"
            :label="$t('settings.invoiceSeries.isDefaultLabel')"
          />
        </UFormField>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="close"
        />
        <UButton
          :label="$t('settings.invoiceSeries.create')"
          color="primary"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
