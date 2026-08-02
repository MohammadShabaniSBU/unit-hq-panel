<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  contactId: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useContactTaskForm()

const urgent = computed({
  get: () => form.priority === 'high',
  set: (value: boolean) => { form.priority = value ? 'high' : 'medium' }
})

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
  }
})

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

async function onSubmit() {
  const created = await submit(props.contactId)
  if (!created) {
    return
  }

  toast.add({ title: t('inbox.quickActions.addTask.successMessage'), color: 'success' })
  emit('saved')
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('inbox.quickActions.addTask.title')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('forms.task.title')"
          name="title"
          required
          :error="fieldError('title')"
        >
          <UInput
            v-model="form.title"
            :placeholder="t('forms.task.title')"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField
          :label="t('forms.task.dueDate')"
          name="due_at"
          :error="fieldError('due_at')"
        >
          <UInput
            v-model="form.due_at"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UCheckbox
          v-model="urgent"
          :label="t('inbox.quickActions.addTask.urgent')"
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
            :label="t('forms.task.cancel')"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="t('forms.task.save')"
            color="primary"
            :loading="submitting"
            :disabled="!form.title.trim()"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
