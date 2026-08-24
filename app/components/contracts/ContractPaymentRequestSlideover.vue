<script setup lang="ts">
import QRCode from 'qrcode'
import { formatMoney } from '~/composables/useMoney'
import type { ApiCharge } from '~/types/contract'
import type { ApiPaymentRequest } from '~/types/paymentRequest'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  charges: Array<ApiCharge>
  currency: string
  submitting?: boolean
  createdRequest?: ApiPaymentRequest | null
  paymentUrl?: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { charge_ids: Array<number>, save_card: boolean }]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { formatDate, formatDateTime, formatRange } = useOrgDateFormat()

const selectedIds = ref<Array<number>>([])
const saveCard = ref(false)
const qrDataUrl = ref<string | null>(null)

function openAmountOf(charge: ApiCharge): number {
  if (charge.open_amount != null) return Number(charge.open_amount)
  return Number(charge.amount)
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const selectableCharges = computed(() =>
  props.charges
    .filter(c => openAmountOf(c) > 0)
    .sort((a, b) => {
      const due = a.due_date.localeCompare(b.due_date)
      return due !== 0 ? due : a.id - b.id
    })
)

const defaultIds = computed(() => {
  const today = todayIso()
  return selectableCharges.value
    .filter(c => c.due_date <= today)
    .map(c => c.id)
})

const total = computed(() => {
  let sum = 0
  for (const charge of selectableCharges.value) {
    if (!selectedIds.value.includes(charge.id)) continue
    sum += openAmountOf(charge)
  }
  return sum.toFixed(2)
})

watch(open, (isOpen) => {
  if (!isOpen) return
  selectedIds.value = [...defaultIds.value]
  saveCard.value = false
  qrDataUrl.value = null
})

watch(
  () => props.paymentUrl,
  async (url) => {
    qrDataUrl.value = null
    if (!url) return
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, {
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'M'
      })
    } catch {
      qrDataUrl.value = null
    }
  },
  { immediate: true }
)

function toggleCharge(id: number, checked: boolean | string) {
  const on = checked === true || checked === 'indeterminate'
  if (on) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id]
  } else {
    selectedIds.value = selectedIds.value.filter(x => x !== id)
  }
}

function chargeLabel(charge: ApiCharge): string {
  const type = t(`billing.paymentRequests.chargeTypes.${charge.charge_type}`, charge.charge_type)
  const period = charge.period_start && charge.period_end
    ? formatRange(charge.period_start, charge.period_end)
    : formatDate(charge.due_date)
  return `${type} · ${period}`
}

function formatAmount(amount: string) {
  return formatMoney(amount, props.currency, locale.value)
}

async function copyUrl() {
  if (!props.paymentUrl) return
  try {
    await navigator.clipboard.writeText(props.paymentUrl)
    toast.add({ title: t('billing.paymentRequests.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('billing.paymentRequests.copyFailed'), color: 'error' })
  }
}

function onCreate() {
  if (selectedIds.value.length === 0) return
  emit('submit', {
    charge_ids: [...selectedIds.value],
    save_card: saveCard.value
  })
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('billing.paymentRequests.requestTitle')"
  >
    <template #body>
      <div
        v-if="createdRequest && paymentUrl"
        class="flex flex-col gap-4"
      >
        <p class="text-sm text-dimmed">
          {{ $t('billing.paymentRequests.linkReady') }}
        </p>
        <div class="rounded-lg border border-default bg-elevated/40 p-3">
          <p class="break-all font-mono text-xs text-highlighted">
            {{ paymentUrl }}
          </p>
        </div>
        <div class="flex flex-wrap items-start gap-4">
          <UButton
            color="primary"
            icon="i-lucide-copy"
            :label="$t('billing.paymentRequests.copyLink')"
            @click="copyUrl"
          />
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :alt="$t('billing.paymentRequests.qrAlt')"
            class="size-[180px] rounded-lg border border-default bg-white p-2"
          >
        </div>
        <dl class="grid gap-2 text-sm">
          <div class="flex justify-between gap-2">
            <dt class="text-dimmed">
              {{ $t('billing.paymentRequests.amount') }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ formatAmount(createdRequest.amount) }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-dimmed">
              {{ $t('billing.paymentRequests.expires') }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ formatDateTime(createdRequest.expires_at) }}
            </dd>
          </div>
        </dl>
      </div>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <p class="text-sm text-dimmed">
          {{ $t('billing.paymentRequests.requestHint') }}
        </p>

        <div
          v-if="selectableCharges.length === 0"
          class="rounded-lg border border-dashed border-default px-3 py-6 text-center text-sm text-dimmed"
        >
          {{ $t('billing.paymentRequests.noOpenCharges') }}
        </div>

        <ul
          v-else
          class="divide-y divide-default rounded-lg border border-default"
        >
          <li
            v-for="charge in selectableCharges"
            :key="charge.id"
            class="flex items-start gap-3 px-3 py-2.5"
          >
            <UCheckbox
              :model-value="selectedIds.includes(charge.id)"
              class="mt-0.5"
              @update:model-value="(v) => toggleCharge(charge.id, v)"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-highlighted">
                {{ chargeLabel(charge) }}
              </p>
              <p class="text-xs text-dimmed">
                {{ $t('billing.paymentRequests.dueOn', { date: formatDate(charge.due_date) }) }}
              </p>
            </div>
            <span class="shrink-0 text-sm font-medium text-highlighted">
              {{ formatAmount(openAmountOf(charge).toFixed(2)) }}
            </span>
          </li>
        </ul>

        <div class="flex items-center justify-between text-sm">
          <span class="text-dimmed">
            {{ $t('billing.paymentRequests.total') }}
          </span>
          <span class="text-base font-semibold text-highlighted">
            {{ formatAmount(total) }}
          </span>
        </div>

        <UCheckbox
          v-model="saveCard"
          :label="$t('billing.paymentRequests.saveCard')"
        />

        <p class="text-xs text-dimmed">
          {{ $t('billing.paymentRequests.expiryNote') }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="$t('common.cancel')"
            @click="open = false"
          />
          <UButton
            color="primary"
            :label="$t('billing.paymentRequests.create')"
            :loading="submitting"
            :disabled="selectedIds.length === 0 || submitting"
            @click="onCreate"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
