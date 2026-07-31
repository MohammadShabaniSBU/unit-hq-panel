import type { ApiLegalEntity, FiscalRegime, TaxIdType } from '~/types/legalEntity'

export interface LegalEntityForm {
  legal_name: string
  trading_name: string
  tax_id: string
  tax_id_type: TaxIdType
  vat_number: string
  country_code: string
  address_line1: string
  address_line2: string
  city: string
  postal_code: string
  fiscal_regime: FiscalRegime
  sepa_creditor_id: string
}

function createDefaultForm(): LegalEntityForm {
  return {
    legal_name: '',
    trading_name: '',
    tax_id: '',
    tax_id_type: 'nif',
    vat_number: '',
    country_code: 'ES',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    fiscal_regime: 'none',
    sepa_creditor_id: ''
  }
}

export function formFromLegalEntity(entity: ApiLegalEntity): LegalEntityForm {
  return {
    legal_name: entity.legal_name,
    trading_name: entity.trading_name ?? '',
    tax_id: entity.tax_id,
    tax_id_type: entity.tax_id_type,
    vat_number: entity.vat_number ?? '',
    country_code: entity.country_code,
    address_line1: entity.address_line1,
    address_line2: entity.address_line2 ?? '',
    city: entity.city,
    postal_code: entity.postal_code,
    fiscal_regime: entity.fiscal_regime,
    sepa_creditor_id: entity.sepa_creditor_id ?? ''
  }
}

function buildPayload(form: LegalEntityForm) {
  const payload: Record<string, unknown> = {
    legal_name: form.legal_name.trim(),
    tax_id: form.tax_id.trim(),
    tax_id_type: form.tax_id_type,
    country_code: form.country_code.trim().toUpperCase(),
    address_line1: form.address_line1.trim(),
    city: form.city.trim(),
    postal_code: form.postal_code.trim(),
    fiscal_regime: form.fiscal_regime
  }

  payload.trading_name = form.trading_name.trim() || null
  payload.vat_number = form.vat_number.trim() || null
  payload.address_line2 = form.address_line2.trim() || null
  payload.sepa_creditor_id = form.sepa_creditor_id.trim() || null

  return payload
}

export function useLegalEntityForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<LegalEntityForm>(createDefaultForm())
  const editingEntityId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const isEditing = computed(() => editingEntityId.value != null)

  function reset() {
    Object.assign(form, createDefaultForm())
    editingEntityId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(entity: ApiLegalEntity | null) {
    reset()

    if (!entity) {
      return
    }

    editingEntityId.value = entity.id
    Object.assign(form, formFromLegalEntity(entity))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingEntityId.value
        ? await patch<ApiLegalEntity>(`/api/legal-entities/${editingEntityId.value}`, payload)
        : await post<ApiLegalEntity>('/api/legal-entities', payload)

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
          ? t('forms.legalEntity.editErrorMessage')
          : t('forms.legalEntity.createErrorMessage')
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
