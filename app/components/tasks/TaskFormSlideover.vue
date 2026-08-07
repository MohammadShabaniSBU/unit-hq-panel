<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { ApiOption } from '~/types/facility'
import type { ApiTask, TaskStatus } from '~/types/task'
import { TASK_STATUSES, taskablePath } from '~/types/task'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  task?: ApiTask | null
}>()

const emit = defineEmits<{
  saved: [task: ApiTask]
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit, priorityOptions, typeOptions } = useContactTaskForm()
const { updateTask } = useTask()

const isEdit = computed(() => props.task != null)
const editStatus = ref<TaskStatus>('open')
const updating = ref(false)

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const contactSelectItems = computed(() => {
  if (!selectedContact.value) {
    return contactItems.value
  }

  const hasSelected = contactItems.value.some(item => item.value === selectedContact.value!.value)
  if (hasSelected) {
    return contactItems.value
  }

  return [selectedContact.value, ...contactItems.value]
})

function onContactSelect(value: number | undefined) {
  if (value == null) {
    selectedContact.value = null
    return
  }

  selectedContact.value = contactSelectItems.value.find(item => item.value === value) ?? {
    value,
    label: String(value)
  }
}

const relatedPath = computed(() => taskablePath(props.task?.taskable))

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

const statusSelectOptions = computed(() =>
  TASK_STATUSES.map(value => ({
    label: t(`taskStatus.${value}`),
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
const localError = ref<string | null>(null)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

function hydrateFromTask(task: ApiTask) {
  form.title = task.title
  form.description = task.description ?? ''
  form.type = task.type ?? undefined
  form.priority = task.priority
  form.due_at = task.due_date ?? ''
  editStatus.value = task.status
}

function clearLocalState() {
  reset()
  contactSearch.value = ''
  selectedContact.value = null
  localError.value = null
  editStatus.value = 'open'
  error.value = null
  fieldErrors.value = {}
}

watch(open, (isOpen) => {
  if (!isOpen) {
    clearLocalState()
    return
  }

  clearLocalState()

  if (props.task) {
    hydrateFromTask(props.task)
  }
})

watch(() => props.task, (task) => {
  if (open.value && task) {
    hydrateFromTask(task)
  }
})

async function onSubmit() {
  localError.value = null

  if (isEdit.value && props.task) {
    updating.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const savedTask = await updateTask(props.task.id, {
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        priority: form.priority,
        type: form.type ?? null,
        due_at: form.due_at.trim() ? form.due_at.trim() : null,
        status: editStatus.value
      })

      toast.add({
        title: t('forms.task.updateSuccessMessage'),
        color: 'success'
      })

      emit('saved', savedTask)
      close()
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.task.updateErrorMessage')
    } finally {
      updating.value = false
    }

    return
  }

  if (!selectedContact.value) {
    localError.value = t('pages.tasks.contactRequired')
    return
  }

  const savedTask = await submit(selectedContact.value.value)

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

const isSubmitting = computed(() => submitting.value || updating.value)
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="isEdit ? $t('forms.task.editTitle') : $t('forms.task.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          v-if="isEdit"
          :label="$t('table.related')"
          name="related"
        >
          <UButton
            v-if="relatedPath && task?.taskable"
            :label="task.taskable.label"
            :to="relatedPath"
            color="neutral"
            variant="link"
            size="sm"
            class="px-0"
          />
          <p
            v-else-if="task?.taskable"
            class="text-sm text-highlighted"
          >
            {{ task.taskable.label }}
          </p>
          <p
            v-else
            class="text-sm text-dimmed"
          >
            {{ $t('common.emptyValue') }}
          </p>
        </UFormField>

        <UFormField
          v-else
          :label="$t('pages.tasks.contact')"
          name="contact_id"
          required
          :error="localError ?? undefined"
        >
          <USelectMenu
            v-model:search-term="contactSearch"
            :model-value="selectedContact?.value"
            :items="contactSelectItems"
            value-key="value"
            ignore-filter
            :loading="contactPending"
            :placeholder="$t('pages.tasks.selectContact')"
            class="w-full"
            @update:model-value="onContactSelect"
          />
        </UFormField>

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
          v-if="isEdit"
          :label="$t('forms.task.status')"
          name="status"
          :error="fieldError('status')"
        >
          <USelect
            v-model="editStatus"
            :items="statusSelectOptions"
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
            :disabled="isSubmitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.task.save')"
            color="primary"
            :loading="isSubmitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
