<script setup lang="ts">
import type { CreateAttributeValue } from '~/composables/useRequiredCreateAttributes'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useContactForm()
const { items: siteItems } = useOptions('/api/sites/options')
const {
  definitions: requiredDefinitions,
  values: attributeValues,
  fieldErrors: attributeFieldErrors,
  validate: validateAttributes,
  toPayload: attributesPayload,
  reset: resetAttributes,
  applyServerErrors: applyAttributeServerErrors
} = useRequiredCreateAttributes('contact')

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

function onAttributeValue(definitionId: number, value: CreateAttributeValue) {
  attributeValues[definitionId] = value
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
    resetAttributes()
  }
})

async function onSubmit() {
  if (!validateAttributes()) {
    return
  }

  const savedContact = await submit(attributesPayload())

  if (!savedContact) {
    applyAttributeServerErrors(fieldErrors.value)
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
          :label="$t('forms.contact.phone')"
          name="phone"
          :error="fieldError('phone')"
        >
          <UInput
            v-model="form.phone"
            type="tel"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contact.site')"
          name="site_id"
          required
          :error="fieldError('site_id')"
        >
          <USelect
            v-model="form.site_id"
            :items="siteItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.contact.site')"
            class="w-full"
          />
        </UFormField>

        <RequiredAttributeFields
          :definitions="requiredDefinitions"
          :values="attributeValues"
          :field-errors="attributeFieldErrors"
          @update:value="onAttributeValue"
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
