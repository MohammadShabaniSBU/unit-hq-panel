import type { ApiDeal } from '~/types/deal'
import type { ApiOffer } from '~/types/offer'
import type { ApiReservation } from '~/types/reservation'
import type { ApiContract } from '~/types/contract'
import type { ApiNote } from '~/types/note'
import type { ApiTask } from '~/composables/useContactDetail'

export interface ApiDealDetail extends ApiDeal {
  offers?: Array<ApiOffer>
  reservations?: Array<ApiReservation>
  contracts?: Array<ApiContract>
  tasks?: Array<ApiTask>
  notes?: Array<ApiNote>
}

export function useDealDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `deal:${id}`,
    () => get<ApiDealDetail>(`/api/deals/${id}`)
  )

  const deal = computed(() => data.value?.data ?? null)

  const activeOffers = computed(() =>
    deal.value?.offers?.filter(o => o.status !== 'expired') ?? []
  )

  const pendingTasks = computed(() =>
    deal.value?.tasks?.filter(t => t.status !== 'done' && t.status !== 'cancelled') ?? []
  )

  function mergeDeal(patch: Partial<ApiDealDetail>) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: { ...data.value.data, ...patch }
    }
  }

  function addTask(task: ApiTask) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: {
        ...data.value.data,
        tasks: [...(data.value.data.tasks ?? []), task]
      }
    }
  }

  function updateTask(task: ApiTask) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: {
        ...data.value.data,
        tasks: (data.value.data.tasks ?? []).map(t => t.id === task.id ? task : t)
      }
    }
  }

  function addNote(note: ApiNote) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: {
        ...data.value.data,
        notes: [note, ...(data.value.data.notes ?? [])]
      }
    }
  }

  return {
    deal,
    activeOffers,
    pendingTasks,
    pending,
    error,
    refresh,
    mergeDeal,
    addTask,
    updateTask,
    addNote
  }
}
