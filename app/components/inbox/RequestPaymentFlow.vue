<script setup lang="ts">
import type { ApiContract } from '~/types/contract'
import type { ApiInboxContextContract } from '~/types/inbox'

const props = defineProps<{
  contracts: Array<ApiInboxContextContract>
}>()

const emit = defineEmits<{
  created: [url: string]
}>()

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()

const chooserOpen = ref(false)
const slideoverOpen = ref(false)
const loadingDetail = ref(false)
const selectedContractId = ref<number | null>(null)
const selectedContract = ref<ApiContract | null>(null)

const {
  submitting,
  actionError,
  create: createPaymentRequest
} = usePaymentRequests(selectedContractId)

async function selectContract(id: number) {
  chooserOpen.value = false
  selectedContractId.value = id
  loadingDetail.value = true

  try {
    const response = await get<ApiContract>(`/api/contracts/${id}`)
    selectedContract.value = response.data
    slideoverOpen.value = true
  } catch {
    toast.add({ title: t('inbox.quickActions.requestPayment.loadError'), color: 'error' })
  } finally {
    loadingDetail.value = false
  }
}

function start() {
  if (props.contracts.length === 0) {
    return
  }

  if (props.contracts.length === 1) {
    selectContract(props.contracts[0]!.id)
    return
  }

  chooserOpen.value = true
}

async function onSubmit(payload: { charge_ids: Array<number>, save_card: boolean }) {
  const created = await createPaymentRequest(payload)
  if (!created) {
    toast.add({
      title: actionError.value ?? t('billing.paymentRequests.createError'),
      color: 'error'
    })
    return
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  slideoverOpen.value = false
  toast.add({ title: t('inbox.quickActions.requestPayment.successMessage'), color: 'success' })
  emit('created', `${origin}${created.url}`)
}

defineExpose({ start, loading: loadingDetail })
</script>

<template>
  <UModal
    v-model:open="chooserOpen"
    :title="t('inbox.quickActions.requestPayment.chooseContract')"
  >
    <template #body>
      <div class="flex flex-col gap-2">
        <UButton
          v-for="contract in contracts"
          :key="contract.id"
          color="neutral"
          variant="outline"
          block
          class="justify-start"
          @click="selectContract(contract.id)"
        >
          {{ contract.unit_number ?? `#${contract.id}` }}
          <span
            v-if="contract.site_name"
            class="text-dimmed"
          >· {{ contract.site_name }}</span>
        </UButton>
      </div>
    </template>
  </UModal>

  <ContractsContractPaymentRequestSlideover
    v-model:open="slideoverOpen"
    :charges="selectedContract?.charges ?? []"
    :currency="selectedContract?.currency ?? 'EUR'"
    :submitting="submitting"
    @submit="onSubmit"
  />
</template>
