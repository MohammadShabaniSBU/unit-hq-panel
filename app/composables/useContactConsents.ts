import type {
  ConsentHistoryRow,
  ConsentListOption,
  ConsentStateRow,
  ConsentTextOption,
  ContactConsentsPayload
} from '~/types/consent'

export function useContactConsents(contactId: MaybeRefOrGetter<number>) {
  const id = computed(() => toValue(contactId))
  const { get, post } = useApi()

  const payload = ref<ContactConsentsPayload | null>(null)
  const texts = ref<Array<ConsentTextOption>>([])
  const pending = ref(false)
  const error = ref(false)

  const state = computed<Array<ConsentStateRow>>(() => payload.value?.state ?? [])
  const history = computed<Array<ConsentHistoryRow>>(() => payload.value?.history ?? [])
  const lists = computed<Array<ConsentListOption>>(() => payload.value?.lists ?? [])

  async function refresh(): Promise<void> {
    pending.value = true
    error.value = false
    try {
      const response = await get<ContactConsentsPayload>(`/api/contacts/${id.value}/consents`)
      payload.value = response.data
    } catch {
      error.value = true
    } finally {
      pending.value = false
    }
  }

  async function loadTexts(): Promise<void> {
    const response = await get<Array<ConsentTextOption>>('/api/consent-texts')
    texts.value = response.data
  }

  async function record(body: {
    channel: string
    subscription_list_id: number
    action: 'granted' | 'withdrawn'
    consent_text_id?: number
    note: string
  }): Promise<void> {
    await post(`/api/contacts/${id.value}/consents`, body)
    await refresh()
  }

  watch(id, () => {
    void refresh()
  }, { immediate: true })

  return {
    state,
    history,
    lists,
    texts,
    pending,
    error,
    refresh,
    loadTexts,
    record
  }
}
