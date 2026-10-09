import type { PreferenceCenterPayload, PreferenceChange } from '~/types/preferenceCenter'

export function usePreferenceCenter() {
  const { get, post } = useApi()

  const preferences = ref<PreferenceCenterPayload | null>(null)
  const pending = ref(false)
  const saving = ref(false)
  const error = ref<unknown>(null)
  const saveError = ref<string | null>(null)

  async function fetchByToken(token: string) {
    pending.value = true
    error.value = null

    try {
      const res = await get<PreferenceCenterPayload>(`/api/comms/preferences/${encodeURIComponent(token)}`)
      preferences.value = res.data
    } catch (e) {
      error.value = e
      preferences.value = null
    } finally {
      pending.value = false
    }
  }

  async function save(token: string, changes: Array<PreferenceChange>, unsubscribeAll = false) {
    saving.value = true
    saveError.value = null

    try {
      const res = await post<PreferenceCenterPayload>(
        `/api/comms/preferences/${encodeURIComponent(token)}`,
        {
          changes,
          unsubscribe_all: unsubscribeAll
        }
      )
      preferences.value = res.data
      return res.data
    } catch (e: unknown) {
      const fetchError = e as { data?: { message?: string } }
      saveError.value = fetchError.data?.message ?? null
      throw e
    } finally {
      saving.value = false
    }
  }

  return {
    preferences,
    pending,
    saving,
    error,
    saveError,
    fetchByToken,
    save
  }
}
