import type { ApiOfferOptionMap } from '~/types/offer'

export function useOfferOptionMap(
  optionId: MaybeRefOrGetter<number | null | undefined>,
  token?: MaybeRefOrGetter<string | null | undefined>
) {
  const { get } = useApi()
  const id = computed(() => toValue(optionId) ?? null)
  const offerToken = computed(() => toValue(token)?.trim() || null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `offer-option-map-${offerToken.value ?? 'auth'}-${id.value ?? 'none'}`,
    async () => {
      if (!id.value) {
        return null as ApiOfferOptionMap | null
      }

      const url = offerToken.value
        ? `/api/offers/token/${offerToken.value}/options/${id.value}/map`
        : `/api/offer-options/${id.value}/map`

      const response = await get<ApiOfferOptionMap>(url)
      return response.data
    },
    { watch: [id, offerToken] }
  )

  const map = computed(() => data.value ?? null)
  const notFound = computed(() => {
    const status = (error.value as { statusCode?: number } | null)?.statusCode
    return status === 404
  })

  return {
    map,
    pending,
    error,
    notFound,
    refresh
  }
}
