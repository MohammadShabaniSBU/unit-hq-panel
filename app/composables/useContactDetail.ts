import type { ApiContact } from '~/types/contact'
import type { ApiContactChannel } from '~/types/contactChannel'
import type { ApiDeal } from '~/types/deal'
import type { ApiReservation } from '~/types/reservation'
import type { ApiContract } from '~/types/contract'
import type { ApiNote } from '~/types/note'
import type { ApiTask } from '~/types/task'

export type { ApiNote } from '~/types/note'
export type { ApiTask } from '~/types/task'

export interface ApiContactDetail extends ApiContact {
  channels?: Array<ApiContactChannel>
  deals?: Array<ApiDeal>
  contracts?: Array<ApiContract>
  reservations?: Array<ApiReservation>
  tasks?: Array<ApiTask>
  notes?: Array<ApiNote>
}

export function useContactDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `contact:${id}`,
    () => get<ApiContactDetail>(`/api/contacts/${id}`)
  )

  const contact = computed(() => data.value?.data ?? null)

  const activeContract = computed(() =>
    contact.value?.contracts?.find(c => c.status === 'active') ?? null
  )

  const activeDeals = computed(() =>
    contact.value?.deals?.filter(d =>
      !['closed_won', 'closed_lost'].includes(d.status)
    ) ?? []
  )

  const openDeal = computed(() => activeDeals.value[0] ?? null)

  const pendingTasks = computed(() =>
    contact.value?.tasks?.filter(t => t.status !== 'done' && t.status !== 'cancelled') ?? []
  )

  const lifecycleJourneySteps = computed(() => {
    const status = contact.value?.status
    const stages = ['prospect', 'lead', 'opportunity', 'tenant']
    const currentIndex = stages.indexOf(status ?? '')

    return stages.map((stage, i) => ({
      key: stage,
      completed: i < currentIndex,
      active: i === currentIndex
    }))
  })

  function mergeContact(patch: Partial<ApiContactDetail>) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: { ...data.value.data, ...patch }
    }
  }

  function addChannel(channel: ApiContactChannel) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: {
        ...data.value.data,
        channels: [...(data.value.data.channels ?? []), channel]
      }
    }
  }

  function updateChannel(channel: ApiContactChannel) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: {
        ...data.value.data,
        channels: (data.value.data.channels ?? []).map(c =>
          c.id === channel.id ? channel : c
        )
      }
    }
  }

  function removeChannel(channelId: number) {
    if (!data.value?.data) return
    data.value = {
      ...data.value,
      data: {
        ...data.value.data,
        channels: (data.value.data.channels ?? []).filter(c => c.id !== channelId)
      }
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

  return {
    contact,
    activeContract,
    activeDeals,
    openDeal,
    pendingTasks,
    lifecycleJourneySteps,
    pending,
    error,
    refresh,
    mergeContact,
    addChannel,
    updateChannel,
    removeChannel,
    addTask,
    updateTask
  }
}
