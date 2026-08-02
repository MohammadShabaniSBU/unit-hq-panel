import type { ApiAircallUsersPayload, ApiAircallUserRow } from '~/types/communications'

export function useAircallUsers() {
  const { get, post, put, del } = useApi()
  const { t } = useI18n()

  const users = ref<Array<ApiAircallUserRow>>([])
  const syncedAt = ref<string | null>(null)
  const uncorrelatedCount = ref(0)
  const pending = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  function applyPayload(payload: ApiAircallUsersPayload) {
    users.value = payload.users
    syncedAt.value = payload.synced_at
    uncorrelatedCount.value = payload.dial_health?.uncorrelated_count ?? 0
  }

  async function load() {
    pending.value = true
    error.value = null
    try {
      const res = await get<ApiAircallUsersPayload>('/api/settings/communications/call/aircall/users')
      applyPayload(res.data)
      return true
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, t('forms.communications.aircallUsers.loadError'))
      return false
    } finally {
      pending.value = false
    }
  }

  async function sync() {
    submitting.value = true
    error.value = null
    try {
      const res = await post<ApiAircallUsersPayload>('/api/settings/communications/call/aircall/users/sync', {})
      applyPayload(res.data)
      return true
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, t('forms.communications.aircallUsers.syncError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function mapUser(aircallUserId: string, employeeId: number) {
    submitting.value = true
    error.value = null
    try {
      const res = await put<{ users: Array<ApiAircallUserRow> }>(
        `/api/settings/communications/call/aircall/users/${aircallUserId}`,
        { employee_id: employeeId }
      )
      users.value = res.data.users
      return true
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, t('forms.communications.aircallUsers.mapError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function unlinkUser(aircallUserId: string) {
    submitting.value = true
    error.value = null
    try {
      await del(`/api/settings/communications/call/aircall/users/${aircallUserId}`)
      await load()
      return true
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, t('forms.communications.aircallUsers.unlinkError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    users,
    syncedAt,
    uncorrelatedCount,
    pending,
    submitting,
    error,
    load,
    sync,
    mapUser,
    unlinkUser
  }
}
