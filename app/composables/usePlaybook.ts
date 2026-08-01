import type {
  ApiPlaybook,
  EnrolmentFilters,
  Playbook,
  PlaybookStep
} from '~/types/playbook'
import { normalizePlaybook, serializeSteps } from '~/types/playbook'

export function usePlaybook(id: MaybeRefOrGetter<string | number>) {
  const { get, patch, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const idRef = computed(() => String(toValue(id)))
  const saving = ref(false)
  const toggling = ref(false)

  const { data, pending, error, refresh } = useAsyncData(
    () => `playbook-${idRef.value}`,
    async () => {
      const response = await get<ApiPlaybook>(`/api/playbooks/${idRef.value}`)
      return normalizePlaybook(response.data)
    },
    { watch: [idRef] }
  )

  const playbook = computed(() => data.value ?? null)

  async function save(payload: {
    name: string
    enrolmentFilters: EnrolmentFilters
    steps: Array<PlaybookStep>
    exitInflight?: boolean
  }): Promise<Playbook | null> {
    saving.value = true
    try {
      const response = await patch<ApiPlaybook>(`/api/playbooks/${idRef.value}`, {
        name: payload.name,
        enrolment_filters: payload.enrolmentFilters,
        steps: serializeSteps(payload.steps)
      })

      if (payload.exitInflight) {
        await post(`/api/playbooks/${idRef.value}/exit-enrolments`, {})
      }

      const next = normalizePlaybook(response.data)
      data.value = next
      toast.add({ title: t('playbooks.toasts.saved'), color: 'success' })
      await refresh()
      return data.value
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
      const firstField = fetchError.data?.errors
        ? Object.values(fetchError.data.errors)[0]?.[0]
        : undefined
      toast.add({
        title: firstField ?? fetchError.data?.message ?? t('playbooks.toasts.saveError'),
        color: 'error'
      })
      return null
    } finally {
      saving.value = false
    }
  }

  async function setActive(active: boolean): Promise<Playbook | null> {
    toggling.value = true
    try {
      const path = active ? 'activate' : 'deactivate'
      const response = await post<ApiPlaybook>(`/api/playbooks/${idRef.value}/${path}`, {})
      const next = normalizePlaybook(response.data)
      data.value = next
      toast.add({
        title: t(active ? 'playbooks.toasts.activated' : 'playbooks.toasts.deactivated'),
        color: 'success'
      })
      await refresh()
      return data.value
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
      const firstField = fetchError.data?.errors
        ? Object.values(fetchError.data.errors)[0]?.[0]
        : undefined
      toast.add({
        title: firstField ?? fetchError.data?.message ?? t('playbooks.toasts.activateError'),
        color: 'error'
      })
      return null
    } finally {
      toggling.value = false
    }
  }

  return {
    playbook,
    pending,
    error,
    refresh,
    saving,
    toggling,
    save,
    setActive
  }
}
