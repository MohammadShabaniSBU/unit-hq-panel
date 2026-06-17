import type { ApiUnitClass } from '~/types/facility'

export interface UnitClassForm {
  code: string
  label: string
  size: number | undefined
}

function createDefaultForm(): UnitClassForm {
  return {
    code: '',
    label: '',
    size: undefined
  }
}

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function formFromUnitClass(unitClass: ApiUnitClass): UnitClassForm {
  return {
    code: unitClass.code,
    label: unitClass.label,
    size: parseOptionalNumber(unitClass.size)
  }
}

function optionalNumber(value: number | undefined) {
  if (value == null || Number.isNaN(value)) {
    return undefined
  }

  return value
}

function buildPayload(form: UnitClassForm) {
  const payload: Record<string, unknown> = {
    code: form.code.trim(),
    label: form.label.trim()
  }

  const size = optionalNumber(form.size)

  if (size != null) {
    payload.size = size
  }

  return payload
}

export function useUnitClassForm() {
  const { post, put } = useApi()
  const { t } = useI18n()
  const form = reactive<UnitClassForm>(createDefaultForm())
  const editingUnitClassId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string[]>>({})

  const isEditing = computed(() => editingUnitClassId.value != null)

  function reset() {
    Object.assign(form, createDefaultForm())
    editingUnitClassId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(unitClass: ApiUnitClass | null) {
    reset()

    if (!unitClass) {
      return
    }

    editingUnitClassId.value = unitClass.id
    Object.assign(form, formFromUnitClass(unitClass))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingUnitClassId.value
        ? await put<ApiUnitClass>(`/api/unit-classes/${editingUnitClassId.value}`, payload)
        : await post<ApiUnitClass>('/api/unit-classes', payload)

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, string[]>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        isEditing.value
          ? t('forms.unitClass.editErrorMessage')
          : t('forms.unitClass.createErrorMessage')
      )
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
    isEditing,
    load,
    reset,
    submit
  }
}
