import type { ApiContractDetail } from '~/types/contract'
import type { ApiNote } from '~/types/note'
import {
  contractInsuranceItem,
  contractUnitItem
} from '~/types/contract'

export function useContractDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `contract:${id}`,
    () => get<ApiContractDetail>(`/api/contracts/${id}`)
  )

  const contract = computed(() => data.value?.data ?? null)

  const unitItem = computed(() =>
    contract.value ? contractUnitItem(contract.value) : null
  )

  const insuranceItem = computed(() =>
    contract.value ? contractInsuranceItem(contract.value) : null
  )

  function mergeContract(patch: Partial<ApiContractDetail>) {
    if (!data.value?.data) return

    data.value = {
      ...data.value,
      data: { ...data.value.data, ...patch }
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
    contract,
    unitItem,
    insuranceItem,
    pending,
    error,
    refresh,
    mergeContract,
    addNote
  }
}
