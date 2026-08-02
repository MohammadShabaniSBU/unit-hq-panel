<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: [templateId: number]
}>()

const { name, purpose, locale, submitting, error, fieldErrors, reset, submit } = useEmailTemplateCreate()

const purposeOptions = [
  { label: 'general', value: 'general' },
  { label: 'debt', value: 'debt' },
  { label: 'lead', value: 'lead' },
  { label: 'offer', value: 'offer' },
  { label: 'system', value: 'system' }
]

const localeOptions = [
  { label: 'es', value: 'es' },
  { label: 'en', value: 'en' },
  { label: 'fr', value: 'fr' }
]

watch(open, (isOpen) => {
  if (!isOpen) reset()
})

async function handleSubmit() {
  const family = await submit()
  if (family) {
    open.value = false
    emit('created', family.id)
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('templates.builder.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <UFormField
          :label="$t('templates.builder.name')"
          :error="fieldErrors.name?.[0]"
          required
        >
          <UInput
            v-model="name"
            :placeholder="$t('templates.builder.namePlaceholder')"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField :label="$t('templates.builder.purpose')">
          <USelect
            v-model="purpose"
            :items="purposeOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('templates.builder.initialLocale')">
          <USelect
            v-model="locale"
            :items="localeOptions"
            value-key="value"
            class="w-full"
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
            :label="$t('templates.builder.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('templates.builder.create')"
            type="submit"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
