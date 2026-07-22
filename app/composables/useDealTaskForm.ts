import { TASK_PRIORITIES, TASK_TYPES, type ApiTask, type TaskPriority, type TaskType } from '~/types/task'

export interface DealTaskForm {
  title: string
  description: string
  type: TaskType | undefined
  priority: TaskPriority
  due_at: string
}

function createDefaultForm(): DealTaskForm {
  return {
    title: '',
    description: '',
    type: undefined,
    priority: 'medium',
    due_at: ''
  }
}

function buildPayload(form: DealTaskForm) {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    priority: form.priority,
    type: form.type ?? null
  }

  if (form.description.trim()) {
    payload.description = form.description.trim()
  } else {
    payload.description = null
  }

  if (form.due_at.trim()) {
    payload.due_at = form.due_at.trim()
  } else {
    payload.due_at = null
  }

  return payload
}

export function useDealTaskForm() {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<DealTaskForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(dealId: number) {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiTask>(
        `/api/deals/${dealId}/tasks`,
        buildPayload(form)
      )

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.task.createErrorMessage')
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    submitting,
    error,
    fieldErrors,
    reset,
    submit,
    priorityOptions: TASK_PRIORITIES,
    typeOptions: TASK_TYPES
  }
}
