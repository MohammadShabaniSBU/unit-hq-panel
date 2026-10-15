import type { ApiResponse } from '~/types/facility'
import type { TemplateToken } from '~/types/email-builder'

export function useTemplateTokens(familyId: MaybeRefOrGetter<string>) {
  const { apiFetch } = useApi()
  const { locale } = useI18n()

  const tokens = ref<Array<TemplateToken>>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const id = computed(() => toValue(familyId))

  async function refresh() {
    const family = id.value
    if (family === '') {
      tokens.value = []
      return
    }

    pending.value = true
    error.value = null
    try {
      const response = await apiFetch<ApiResponse<Array<TemplateToken>>>(
        `/api/template-families/${family}/tokens`,
        { headers: { 'Accept-Language': locale.value } }
      )
      tokens.value = response.data
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Failed to load tokens.'
      tokens.value = []
    } finally {
      pending.value = false
    }
  }

  watch([id, locale], () => {
    void refresh()
  }, { immediate: true })

  return { tokens, pending, error, refresh }
}
