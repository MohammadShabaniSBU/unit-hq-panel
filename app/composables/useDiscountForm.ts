import type {
  ApiDiscount,
  DiscountCustomerTerms,
  DiscountFreeTimeTier,
  DiscountKind
} from '~/types/facility'

export interface DiscountForm {
  name: string
  kind: DiscountKind
  percent: string
  tracks_rate_changes: boolean
  tiers: Array<DiscountFreeTimeTier>
  agent_offerable: boolean
  terms_en: string
  terms_es: string
  terms_fr: string
}

function createDefaultForm(): DiscountForm {
  return {
    name: '',
    kind: 'percent',
    percent: '',
    tracks_rate_changes: true,
    tiers: [{ min_commitment_weeks: 4, free_weeks: 2 }],
    agent_offerable: false,
    terms_en: '',
    terms_es: '',
    terms_fr: ''
  }
}

export function formFromDiscount(discount: ApiDiscount): DiscountForm {
  const tiers = 'tiers' in discount.params
    ? discount.params.tiers.map(tier => ({ ...tier }))
    : [{ min_commitment_weeks: 4, free_weeks: 2 }]

  return {
    name: discount.name,
    kind: discount.kind,
    percent: 'percent' in discount.params ? discount.params.percent : '',
    tracks_rate_changes: discount.tracks_rate_changes,
    tiers,
    agent_offerable: discount.agent_offerable,
    terms_en: discount.customer_terms?.en ?? '',
    terms_es: discount.customer_terms?.es ?? '',
    terms_fr: discount.customer_terms?.fr ?? ''
  }
}

function customerTermsPayload(form: DiscountForm): DiscountCustomerTerms | null {
  if (!form.agent_offerable) {
    return null
  }

  const terms: DiscountCustomerTerms = {}
  if (form.terms_en.trim() !== '') {
    terms.en = form.terms_en.trim()
  }
  if (form.terms_es.trim() !== '') {
    terms.es = form.terms_es.trim()
  }
  if (form.terms_fr.trim() !== '') {
    terms.fr = form.terms_fr.trim()
  }

  return terms
}

function buildPayload(form: DiscountForm) {
  const customer_terms = customerTermsPayload(form)

  if (form.kind === 'percent') {
    return {
      name: form.name.trim(),
      kind: form.kind,
      params: { percent: form.percent },
      tracks_rate_changes: form.tracks_rate_changes,
      agent_offerable: form.agent_offerable,
      customer_terms
    }
  }

  return {
    name: form.name.trim(),
    kind: form.kind,
    params: {
      tiers: form.tiers.map(tier => ({
        min_commitment_weeks: Number(tier.min_commitment_weeks),
        free_weeks: Number(tier.free_weeks)
      }))
    },
    tracks_rate_changes: false,
    agent_offerable: form.agent_offerable,
    customer_terms
  }
}

export function useDiscountForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<DiscountForm>(createDefaultForm())
  const editingDiscountId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})
  const alignmentWarnings = ref<Array<string>>([])

  const isEditing = computed(() => editingDiscountId.value != null)

  const kindOptions = computed(() => [
    { label: t('settings.discounts.kindPercent'), value: 'percent' as DiscountKind },
    { label: t('settings.discounts.kindFreeTime'), value: 'free_time' as DiscountKind }
  ])

  function reset() {
    Object.assign(form, createDefaultForm())
    editingDiscountId.value = null
    error.value = null
    fieldErrors.value = {}
    alignmentWarnings.value = []
  }

  function load(discount: ApiDiscount | null) {
    reset()

    if (!discount) {
      return
    }

    editingDiscountId.value = discount.id
    Object.assign(form, formFromDiscount(discount))
    alignmentWarnings.value = [...discount.alignment_warnings]
  }

  function addTier() {
    const last = form.tiers[form.tiers.length - 1]
    form.tiers.push({
      min_commitment_weeks: (last?.min_commitment_weeks ?? 0) + 4,
      free_weeks: (last?.free_weeks ?? 0) + 2
    })
  }

  function removeTier(index: number) {
    if (form.tiers.length <= 1) {
      return
    }
    form.tiers.splice(index, 1)
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingDiscountId.value
        ? await patch<ApiDiscount>(`/api/discounts/${editingDiscountId.value}`, payload)
        : await post<ApiDiscount>('/api/discounts', payload)

      alignmentWarnings.value = [...response.data.alignment_warnings]
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
          ? t('settings.discounts.editError')
          : t('settings.discounts.createError')
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
    alignmentWarnings,
    isEditing,
    kindOptions,
    load,
    reset,
    addTier,
    removeTier,
    submit
  }
}
