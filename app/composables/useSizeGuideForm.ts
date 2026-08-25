import type { ApiSizeGuide, SizeGuideMetric } from '~/types/facility'

export interface SizeGuideForm {
  metric: SizeGuideMetric
  site_id: number | ''
  unit_class_id: number | ''
  min_quantity: number | ''
  max_quantity: number | ''
  min_size: string
  max_size: string
  notes: string
}

function createDefaultForm(): SizeGuideForm {
  return {
    metric: 'standard_boxes',
    site_id: '',
    unit_class_id: '',
    min_quantity: '',
    max_quantity: '',
    min_size: '',
    max_size: '',
    notes: ''
  }
}

export function formFromSizeGuide(guide: ApiSizeGuide): SizeGuideForm {
  return {
    metric: guide.metric,
    site_id: guide.site_id ?? '',
    unit_class_id: guide.unit_class_id ?? '',
    min_quantity: guide.min_quantity ?? '',
    max_quantity: guide.max_quantity ?? '',
    min_size: guide.min_size ?? '',
    max_size: guide.max_size ?? '',
    notes: guide.notes ?? ''
  }
}

function emptyToNull(value: number | string | '') {
  return value === '' ? null : value
}

function buildPayload(form: SizeGuideForm) {
  const classId = emptyToNull(form.unit_class_id)

  return {
    metric: form.metric,
    site_id: emptyToNull(form.site_id),
    unit_class_id: classId,
    min_quantity: emptyToNull(form.min_quantity),
    max_quantity: emptyToNull(form.max_quantity),
    min_size: classId === null ? emptyToNull(form.min_size) : null,
    max_size: classId === null ? emptyToNull(form.max_size) : null,
    notes: form.notes.trim() === '' ? null : form.notes.trim()
  }
}

export function useSizeGuideForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<SizeGuideForm>(createDefaultForm())
  const editingId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const isEditing = computed(() => editingId.value != null)

  const metricOptions = computed(() => [
    { label: t('facility.size_guides.metrics.standard_boxes'), value: 'standard_boxes' as SizeGuideMetric },
    { label: t('facility.size_guides.metrics.room_equivalent'), value: 'room_equivalent' as SizeGuideMetric },
    { label: t('facility.size_guides.metrics.vehicle'), value: 'vehicle' as SizeGuideMetric }
  ])

  function reset() {
    Object.assign(form, createDefaultForm())
    editingId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(guide: ApiSizeGuide | null) {
    reset()

    if (!guide) {
      return
    }

    editingId.value = guide.id
    Object.assign(form, formFromSizeGuide(guide))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingId.value
        ? await patch<ApiSizeGuide>(`/api/size-guides/${editingId.value}`, payload)
        : await post<ApiSizeGuide>('/api/size-guides', payload)

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        isEditing.value
          ? t('facility.size_guides.editError')
          : t('facility.size_guides.createError')
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
    metricOptions,
    load,
    reset,
    submit
  }
}
