<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: [templateId: number]
}>()

const { t } = useI18n()
const { name, submitting, error, fieldErrors, reset, submit } = useEmailTemplateCreate()

watch(open, (isOpen) => {
  if (!isOpen) reset()
})

async function handleSubmit() {
  const template = await submit()
  if (template) {
    open.value = false
    emit('created', template.id)
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('forms.emailTemplate.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <UFormField
          :label="$t('forms.emailTemplate.name')"
          :error="fieldErrors.name?.[0]"
          required
        >
          <UInput
            v-model="name"
            :placeholder="$t('forms.emailTemplate.namePlaceholder')"
            class="w-full"
            autofocus
          />
        </UFormField>

        <div
          v-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('forms.emailTemplate.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('forms.emailTemplate.create')"
            type="submit"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
