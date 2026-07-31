import type { ApiUnitHold, PlaceUnitHoldPayload } from '~/types/unit'

export function useUnitHolds(unitId: MaybeRefOrGetter<number | string | undefined>) {
  const { get, post, del } = useApi()
  const id = computed(() => {
    const value = toValue(unitId)
    return value != null && value !== '' ? String(value) : null
  })

  const {
    data,
    pending,
    error,
    refresh
  } = useAsyncData(
    () => `unit-holds-${id.value ?? 'none'}`,
    async () => {
      if (!id.value) {
        return [] as Array<ApiUnitHold>
      }

      const response = await get<Array<ApiUnitHold>>(`/api/units/${id.value}/holds`)
      return response.data
    },
    { watch: [id], immediate: true }
  )

  const holds = computed(() => data.value ?? [])

  const activeHold = computed(() =>
    holds.value.find(hold => hold.released_at == null && hold.hold_type !== 'overlock') ?? null
  )

  const releasing = ref(false)
  const placing = ref(false)

  async function placeHold(payload: PlaceUnitHoldPayload) {
    if (!id.value) {
      throw new Error('Missing unit id')
    }

    placing.value = true
    try {
      const body: Record<string, unknown> = {
        hold_type: payload.hold_type,
        reason: payload.reason
      }

      if (payload.starts_on) {
        body.starts_on = payload.starts_on
      }

      if (payload.ends_on) {
        body.ends_on = payload.ends_on
      }

      const response = await post<ApiUnitHold>(`/api/units/${id.value}/holds`, body)
      await refresh()
      return response.data
    } finally {
      placing.value = false
    }
  }

  async function releaseHold(holdId: number) {
    if (!id.value) {
      throw new Error('Missing unit id')
    }

    releasing.value = true
    try {
      await del(`/api/units/${id.value}/holds/${holdId}`)
      await refresh()
    } finally {
      releasing.value = false
    }
  }

  return {
    holds,
    activeHold,
    pending,
    error,
    placing,
    releasing,
    refresh,
    placeHold,
    releaseHold
  }
}

export function useUnitOccupancies(unitId: MaybeRefOrGetter<number | string | undefined>) {
  const { get } = useApi()
  const id = computed(() => {
    const value = toValue(unitId)
    return value != null && value !== '' ? String(value) : null
  })

  const {
    data,
    pending,
    error,
    refresh
  } = useAsyncData(
    () => `unit-occupancies-${id.value ?? 'none'}`,
    async () => {
      if (!id.value) {
        return [] as Array<import('~/types/unit').ApiUnitOccupancy>
      }

      const response = await get<Array<import('~/types/unit').ApiUnitOccupancy>>(
        `/api/units/${id.value}/occupancies`
      )
      return response.data
    },
    { watch: [id], immediate: true }
  )

  return {
    occupancies: computed(() => data.value ?? []),
    pending,
    error,
    refresh
  }
}
