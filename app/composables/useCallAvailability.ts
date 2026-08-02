import type { ApiCallAvailability } from '~/types/communications'

export function useCallAvailability() {
  const { get } = useApi()

  const availability = ref<ApiCallAvailability | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    pending.value = true
    error.value = null
    try {
      const res = await get<ApiCallAvailability>('/api/calls/availability')
      availability.value = res.data
      return availability.value
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message ?? 'Failed to load call availability.'
      availability.value = null
      return null
    } finally {
      pending.value = false
    }
  }

  const canDial = computed(() => availability.value?.can_dial === true)
  const disabledReason = computed(() => availability.value?.disabled_reason ?? null)

  return {
    availability,
    pending,
    error,
    canDial,
    disabledReason,
    refresh
  }
}
