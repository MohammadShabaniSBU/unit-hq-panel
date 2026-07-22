<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { ApiTask } from '~/types/task'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  dealId: number
}>()

const emit = defineEmits<{
  saved: [task: ApiTask]
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit, priorityOptions, typeOptions } = useDealTaskForm()

const prioritySelectOptions = computed(() =>
  priorityOptions.map(value => ({
    label: t(`taskPriority.${value}`),
    value
  }))
)

const typeSelectOptions = computed(() =>
  typeOptions.map(value => ({
    label: t(`taskType.${value}`),
    value
  }))
)

function parseIsoDate(value: string): CalendarDate | null {
  if (!value.trim()) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new CalendarDate(year, month, day)
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) {
    return ''
  }

  const month = String(value.month).padStart(2, '0')
  const day = String(value.day).padStart(2, '0')

  return `${value.year}-${month}-${day}`
}

const dueAt = computed({
  get: () => parseIsoDate(form.due_at),
  set: (value: CalendarDate | null) => {
    form.due_at = formatIsoDate(value)
  }
})

const dueAtInput = useTemplateRef('dueAtInput')

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
  const savedTask = await submit(props.dealId)

  if (!savedTask) {
    return
  }

  toast.add({
    title: t('forms.task.createSuccessMessage'),
    color: 'success'
  })

  emit('saved', savedTask)
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('forms.task.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.task.title')"
          name="title"
          required
          :error="fieldError('title')"
        >
          <UInput
            v-model="form.title"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.task.description')"
          name="description"
          :error="fieldError('description')"
        >
          <UTextarea
            v-model="form.description"
            class="w-full"
            :rows="4"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.task.type')"
          name="type"
          :error="fieldError('type')"
        >
          <USelect
            v-model="form.type"
            :items="typeSelectOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.task.type')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.task.priority')"
          name="priority"
          :error="fieldError('priority')"
        >
          <USelect
            v-model="form.priority"
            :items="prioritySelectOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.task.dueDate')"
          name="due_at"
          :error="fieldError('due_at')"
        >
          <UInputDate
            ref="dueAtInput"
            v-model="dueAt"
            class="w-full"
          >
            <template #trailing>
              <UPopover :reference="dueAtInput?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="$t('forms.task.dueDate')"
                  class="px-0"
                />

                <template #content>
                  <UCalendar
                    v-model="dueAt"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
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
            :label="$t('forms.task.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.task.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
