import type { ApiContact } from '~/types/contact'
import type { ApiDeal } from '~/types/deal'
import type { ApiReservation } from '~/types/reservation'
import type { ApiLease } from '~/types/lease'

export interface ApiTask {
  id: number
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  due_date: string | null
  remind_at: string | null
  created_at: string
}

export interface ApiComment {
  id: number
  body: string
  created_at: string
}

export interface ApiContactChannel {
  id: number
  type: string
  value: string
}

export interface ApiContactDetail extends ApiContact {
  channels?: Array<ApiContactChannel>
  deals?: Array<ApiDeal>
  leases?: Array<ApiLease>
  reservations?: Array<ApiReservation>
  tasks?: Array<ApiTask>
  comments?: Array<ApiComment>
}

export function useContactDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `contact:${id}`,
    () => get<ApiContactDetail>(`/api/contacts/${id}`)
  )

  const contact = computed(() => data.value?.data ?? null)

  const activeLease = computed(() =>
    contact.value?.leases?.find(l => l.status === 'active') ?? null
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

  return {
    contact,
    activeLease,
    activeDeals,
    openDeal,
    pendingTasks,
    lifecycleJourneySteps,
    pending,
    error,
    refresh
  }
}
