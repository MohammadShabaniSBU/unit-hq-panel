import type { ApiNote } from '~/types/note'
import type { ApiReservation } from '~/types/reservation'

export interface ApiReservationDetail extends ApiReservation {
  notes?: Array<ApiNote>
}

export function useReservationDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `reservation:${id}`,
    () => get<ApiReservationDetail>(`/api/reservations/${id}`)
  )

  const reservation = computed(() => data.value?.data ?? null)

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
    reservation,
    pending,
    error,
    refresh,
    addNote
  }
}
