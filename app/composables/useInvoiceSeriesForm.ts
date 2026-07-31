import type { ApiInvoiceSeries, InvoiceSeriesKind } from '~/types/invoiceSeries'

export interface InvoiceSeriesForm {
  code: string
  kind: InvoiceSeriesKind
  starting_number: number
  is_default: boolean
}

function createDefaultForm(): InvoiceSeriesForm {
  return {
    code: '',
    kind: 'ordinary',
    starting_number: 1,
    is_default: false
  }
}

export function useInvoiceSeriesForm(entityId: Ref<number> | ComputedRef<number>) {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<InvoiceSeriesForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(): Promise<ApiInvoiceSeries | null> {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiInvoiceSeries>(
        `/api/legal-entities/${entityId.value}/invoice-series`,
        {
          code: form.code.trim(),
          kind: form.kind,
          starting_number: form.starting_number,
          is_default: form.is_default
        }
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
      error.value = fetchError.data?.message ?? t('settings.invoiceSeries.createError')
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
    submit
  }
}
