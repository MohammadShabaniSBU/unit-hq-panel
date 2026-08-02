import type { ApiCallAvailability, CallDisabledReason } from '~/types/communications'

const availability = ref<ApiCallAvailability | null>(null)
const pending = ref(false)
const error = ref<string | null>(null)
let warmed = false

/**
 * Shared per-tab call availability (S12-00/01). Buttons never guess —
 * they read this cached contract (API caches 60s server-side).
 */
export function useCallAvailability() {
  const { get } = useApi()

  async function refresh() {
    pending.value = true
    error.value = null
    try {
      const res = await get<ApiCallAvailability>('/api/calls/availability')
      availability.value = res.data
      warmed = true
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

  async function ensureLoaded() {
    if (warmed || pending.value) {
      return availability.value
    }
    return refresh()
  }

  const canDial = computed(() => availability.value?.can_dial === true)
  const disabledReason = computed<CallDisabledReason | null>(
    () => availability.value?.disabled_reason ?? null
  )

  return {
    availability,
    pending,
    error,
    canDial,
    disabledReason,
    refresh,
    ensureLoaded
  }
}
