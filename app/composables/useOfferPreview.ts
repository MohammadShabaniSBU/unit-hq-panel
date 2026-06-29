import type { ApiOffer } from '~/types/offer'

export function useOfferPreview() {
  const { get, post } = useApi()

  const offer = ref<ApiOffer | null>(null)
  const pending = ref(false)
  const error = ref<unknown>(null)
  const selectingOptionId = ref<number | null>(null)

  async function fetchOfferByToken(token: string) {
    pending.value = true
    error.value = null

    try {
      const res = await get<ApiOffer>(`/api/offers/token/${token}`)
      offer.value = res.data
    } catch (e) {
      error.value = e
      offer.value = null
    } finally {
      pending.value = false
    }
  }

  async function selectOption(optionId: number) {
    selectingOptionId.value = optionId

    try {
      const res = await post<ApiOffer>(`/api/offer-options/${optionId}/select`, {})
      offer.value = res.data
      return res.data
    } finally {
      selectingOptionId.value = null
    }
  }

  return {
    offer,
    pending,
    error,
    selectingOptionId,
    fetchOfferByToken,
    selectOption,
  }
}
