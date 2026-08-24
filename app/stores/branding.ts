import type { DateFormatPattern } from '~/utils/orgDateFormat'
import { DEFAULT_DATE_FORMAT, isDateFormatPattern } from '~/utils/orgDateFormat'

export interface ApiBranding {
  company_name: string
  date_format: DateFormatPattern
}

export const useBrandingStore = defineStore('branding', () => {
  const companyName = ref('')
  const dateFormat = ref<DateFormatPattern>(DEFAULT_DATE_FORMAT)
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  function apply(branding: Partial<ApiBranding> | null | undefined) {
    if (branding?.company_name != null) {
      companyName.value = branding.company_name
    }

    if (isDateFormatPattern(branding?.date_format)) {
      dateFormat.value = branding.date_format
    }
  }

  async function load(force = false) {
    if (loaded.value && !force) {
      return
    }

    if (inflight && !force) {
      return inflight
    }

    const { get } = useApi()

    inflight = (async () => {
      try {
        const response = await get<ApiBranding>('/api/branding')
        apply(response.data)
        loaded.value = true
      } catch {
        loaded.value = true
      } finally {
        inflight = null
      }
    })()

    return inflight
  }

  function setDateFormat(format: DateFormatPattern) {
    dateFormat.value = isDateFormatPattern(format) ? format : DEFAULT_DATE_FORMAT
  }

  return {
    companyName,
    dateFormat,
    loaded,
    apply,
    load,
    setDateFormat
  }
})
