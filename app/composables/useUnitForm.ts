import type { ApiUnit } from '~/types/facility'

export interface UnitForm {
  site_id: number | undefined
  unit_class_id: number | undefined
  unit_number: string
  actual_width: number | undefined
  actual_depth: number | undefined
  actual_height: number | undefined
  note: string
  enabled: boolean
}

function createDefaultForm(): UnitForm {
  return {
    site_id: undefined,
    unit_class_id: undefined,
    unit_number: '',
    actual_width: undefined,
    actual_depth: undefined,
    actual_height: undefined,
    note: '',
    enabled: true
  }
}

function parseOptionalNumber(value: string | null) {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function formFromUnit(unit: ApiUnit): UnitForm {
  return {
    site_id: unit.site_id,
    unit_class_id: unit.unit_class_id,
    unit_number: unit.unit_number,
    actual_width: parseOptionalNumber(unit.actual_width),
    actual_depth: parseOptionalNumber(unit.actual_depth),
    actual_height: parseOptionalNumber(unit.actual_height),
    note: unit.note ?? '',
    enabled: unit.enabled
  }
}

function optionalNumber(value: number | undefined) {
  if (value == null || Number.isNaN(value)) {
    return undefined
  }

  return value
}

function buildPayload(form: UnitForm) {
  const payload: Record<string, unknown> = {
    site_id: form.site_id,
    unit_class_id: form.unit_class_id,
    unit_number: form.unit_number.trim(),
    enabled: form.enabled
  }

  const actualWidth = optionalNumber(form.actual_width)
  const actualDepth = optionalNumber(form.actual_depth)
  const actualHeight = optionalNumber(form.actual_height)

  if (actualWidth != null) {
    payload.actual_width = actualWidth
  }

  if (actualDepth != null) {
    payload.actual_depth = actualDepth
  }

  if (actualHeight != null) {
    payload.actual_height = actualHeight
  }

  if (form.note.trim()) {
    payload.note = form.note.trim()
  }

  return payload
}

export function useUnitForm() {
  const { post, put } = useApi()
  const { t } = useI18n()
  const form = reactive<UnitForm>(createDefaultForm())
  const editingUnitId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string[]>>({})

  const isEditing = computed(() => editingUnitId.value != null)

  function reset() {
    Object.assign(form, createDefaultForm())
    editingUnitId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(unit: ApiUnit | null) {
    reset()

    if (!unit) {
      return
    }

    editingUnitId.value = unit.id
    Object.assign(form, formFromUnit(unit))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingUnitId.value
        ? await put<ApiUnit>(`/api/units/${editingUnitId.value}`, payload)
        : await post<ApiUnit>('/api/units', payload)

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
          ? t('forms.unit.editErrorMessage')
          : t('forms.unit.createErrorMessage')
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
