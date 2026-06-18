<script setup lang="ts">
import { CONTACT_SOURCES } from '~/types/contact'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useContactForm()

const sourceOptions = computed(() =>
  CONTACT_SOURCES.map(value => ({
    label: t(`contactSource.${value}`),
    value
  }))
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
  }
})

async function onSubmit() {
  const savedContact = await submit()

  if (!savedContact) {
    return
  }

  toast.add({
    title: t('forms.contact.createSuccessMessage'),
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
    :title="$t('forms.contact.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.contact.firstName')"
          name="first_name"
          required
          :error="fieldError('first_name')"
        >
          <UInput
            v-model="form.first_name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contact.lastName')"
          name="last_name"
          required
          :error="fieldError('last_name')"
        >
          <UInput
            v-model="form.last_name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contact.email')"
          name="email"
          :error="fieldError('email')"
        >
          <UInput
            v-model="form.email"
            type="email"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contact.company')"
          name="company"
          :error="fieldError('company')"
        >
          <UInput
            v-model="form.company"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contact.source')"
          name="source"
          :error="fieldError('source')"
        >
          <USelect
            v-model="form.source"
            :items="sourceOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.contact.source')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contact.sourceDetail')"
          name="source_detail"
          :error="fieldError('source_detail')"
        >
          <UInput
            v-model="form.source_detail"
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
            :label="$t('forms.contact.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.contact.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
