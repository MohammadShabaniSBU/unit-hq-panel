<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { getLocalTimeZone, today } from '@internationalized/date'
import { formatMoney } from '~/composables/useMoney'
import type { ApiCharge } from '~/types/contract'
import type { PaymentMethod, RecordPaymentPayload } from '~/types/payment'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  overdueAmount: string
  currency: string
  charges: Array<ApiCharge>
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: RecordPaymentPayload]
}>()

const { t, locale } = useI18n()

const amount = ref('')
const method = ref<PaymentMethod>('cash')
const receivedOn = shallowRef<CalendarDate | null>(null)
const reference = ref('')
const allocationRows = ref<Array<{ charge_id: number, amount: string, open: string, label: string }>>([])

const methodItems = computed(() => [
  { value: 'cash' as const, label: t('billing.payments.manual.methods.cash') },
  { value: 'bank_transfer' as const, label: t('billing.payments.manual.methods.bank_transfer') },
  { value: 'card_external' as const, label: t('billing.payments.manual.methods.card_external') }
])

function toIso(date: CalendarDate | null): string | null {
  if (!date) return null
  const y = String(date.year).padStart(4, '0')
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function openAmountOf(charge: ApiCharge): number {
  if (charge.open_amount != null) return Number(charge.open_amount)
  return Number(charge.amount)
}

function planOldestDueFirst(paymentAmount: number): Array<{ charge_id: number, amount: string, open: string, label: string }> {
  let remaining = paymentAmount
  const sorted = [...props.charges]
    .filter(c => openAmountOf(c) > 0)
    .sort((a, b) => {
      const due = a.due_date.localeCompare(b.due_date)
      return due !== 0 ? due : a.id - b.id
    })

  const rows: Array<{ charge_id: number, amount: string, open: string, label: string }> = []
  for (const charge of sorted) {
    if (remaining <= 0) break
    const openAmt = openAmountOf(charge)
    const take = Math.min(openAmt, remaining)
    rows.push({
      charge_id: charge.id,
      amount: take.toFixed(2),
      open: openAmt.toFixed(2),
      label: charge.description || `${charge.charge_type} #${charge.id} · ${charge.due_date}`
    })
    remaining = Math.round((remaining - take) * 100) / 100
  }
  return rows
}

function rebuildAllocations() {
  const paymentAmount = Number(amount.value) || 0
  allocationRows.value = planOldestDueFirst(paymentAmount)
}

watch(open, (isOpen) => {
  if (!isOpen) return
  amount.value = props.overdueAmount && Number(props.overdueAmount) > 0
    ? props.overdueAmount
    : ''
  method.value = 'cash'
  receivedOn.value = today(getLocalTimeZone())
  reference.value = ''
  rebuildAllocations()
})

watch(amount, () => {
  if (open.value) rebuildAllocations()
})

const allocatedTotal = computed(() =>
  allocationRows.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
)

const remainder = computed(() => {
  const paymentAmount = Number(amount.value) || 0
  return Math.max(0, Math.round((paymentAmount - allocatedTotal.value) * 100) / 100)
})

function onSubmit() {
  const received = toIso(receivedOn.value)
  if (!received || !amount.value || Number(amount.value) <= 0) return

  const allocations = allocationRows.value
    .filter(row => Number(row.amount) > 0)
    .map(row => ({
      charge_id: row.charge_id,
      amount: Number(row.amount).toFixed(2)
    }))

  emit('submit', {
    amount: Number(amount.value).toFixed(2),
    method: method.value,
    received_on: received,
    reference: reference.value.trim() || null,
    allocations: allocations.length > 0 ? allocations : undefined
  })
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('billing.payments.manual.recordTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField :label="$t('billing.payments.manual.amount')">
          <UInput
            v-model="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </UFormField>

        <UFormField :label="$t('billing.payments.manual.method')">
          <USelect
            v-model="method"
            :items="methodItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('billing.payments.manual.receivedOn')">
          <UCalendar
            v-model="receivedOn"
            class="rounded-lg border border-default p-2"
          />
        </UFormField>

        <UFormField :label="$t('billing.payments.manual.reference')">
          <UInput
            v-model="reference"
            :placeholder="$t('billing.payments.manual.referencePlaceholder')"
          />
        </UFormField>

        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-highlighted">
            {{ $t('billing.payments.manual.allocations') }}
          </h3>
          <p class="text-xs text-dimmed">
            {{ $t('billing.payments.manual.allocationsHint') }}
          </p>

          <div
            v-if="!allocationRows.length"
            class="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-dimmed"
          >
            {{ $t('billing.payments.manual.noOpenCharges') }}
          </div>

          <div
            v-for="row in allocationRows"
            :key="row.charge_id"
            class="grid grid-cols-[1fr_7rem] items-center gap-2 rounded-lg border border-default px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ row.label }}
              </p>
              <p class="text-xs text-dimmed">
                {{ $t('billing.payments.manual.openAmount', {
                  amount: formatMoney(row.open, currency, locale)
                }) }}
              </p>
            </div>
            <UInput
              v-model="row.amount"
              type="number"
              step="0.01"
              min="0"
              size="sm"
            />
          </div>

          <p
            v-if="remainder > 0"
            class="text-xs text-dimmed"
          >
            {{ $t('billing.payments.manual.remainderCredit', {
              amount: formatMoney(remainder.toFixed(2), currency, locale)
            }) }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :label="$t('common.cancel')"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="$t('billing.payments.manual.record')"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
