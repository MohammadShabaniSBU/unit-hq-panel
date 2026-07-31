<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { formatMoney } from '~/composables/useMoney'
import type {
  DepositSettlementOutcome,
  VacatePayload,
  VacatePreview
} from '~/types/contract'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  depositAmount: string
  currency: string
  scheduledMoveOutOn?: string | null
  submitting?: boolean
  previewPending?: boolean
  preview: VacatePreview | null
}>()

const emit = defineEmits<{
  preview: [payload: VacatePayload]
  submit: [payload: VacatePayload]
}>()

const { t, locale } = useI18n()

const moveOut = shallowRef<CalendarDate | null>(null)
const outcome = ref<DepositSettlementOutcome>('released')
const deductions = ref<Array<{ amount: string, reason: string }>>([{ amount: '', reason: '' }])
const forfeitReason = ref('')

const outcomeItems = computed(() => [
  { value: 'released' as const, label: t('contracts.deposit.outcomes.released') },
  { value: 'deducted' as const, label: t('contracts.deposit.outcomes.deducted') },
  { value: 'forfeited' as const, label: t('contracts.deposit.outcomes.forfeited') }
])

watch(open, (isOpen) => {
  if (!isOpen) return

  if (props.scheduledMoveOutOn) {
    try {
      moveOut.value = parseDate(props.scheduledMoveOutOn)
    } catch {
      moveOut.value = today(getLocalTimeZone())
    }
  } else {
    moveOut.value = today(getLocalTimeZone())
  }

  outcome.value = 'released'
  deductions.value = [{ amount: '', reason: '' }]
  forfeitReason.value = ''
  emitPreview()
})

watch([moveOut, outcome, deductions, forfeitReason], () => {
  if (open.value) emitPreview()
}, { deep: true })

function toIso(date: CalendarDate | null): string | null {
  if (!date) return null
  const y = String(date.year).padStart(4, '0')
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildPayload(): VacatePayload | null {
  const moveOutOn = toIso(moveOut.value)
  if (!moveOutOn) return null

  if (outcome.value === 'released') {
    return { move_out_on: moveOutOn, deposit: { outcome: 'released' } }
  }

  if (outcome.value === 'forfeited') {
    return {
      move_out_on: moveOutOn,
      deposit: {
        outcome: 'forfeited',
        deductions: [{ amount: props.depositAmount, reason: forfeitReason.value.trim() }]
      }
    }
  }

  const lines = deductions.value
    .filter(d => d.amount && d.reason.trim())
    .map(d => ({ amount: d.amount, reason: d.reason.trim() }))

  return {
    move_out_on: moveOutOn,
    deposit: { outcome: 'deducted', deductions: lines }
  }
}

function emitPreview() {
  const payload = buildPayload()
  if (!payload) return
  if (payload.deposit.outcome === 'forfeited' && !payload.deposit.deductions?.[0]?.reason) return
  if (payload.deposit.outcome === 'deducted' && (!payload.deposit.deductions || payload.deposit.deductions.length === 0)) return
  emit('preview', payload)
}

function addDeduction() {
  deductions.value.push({ amount: '', reason: '' })
}

function removeDeduction(index: number) {
  deductions.value.splice(index, 1)
  if (deductions.value.length === 0) {
    deductions.value.push({ amount: '', reason: '' })
  }
}

const deductionTotal = computed(() => {
  return deductions.value.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
})

const remainder = computed(() => {
  return Math.max(0, Number(props.depositAmount) - deductionTotal.value)
})

function onSubmit() {
  const payload = buildPayload()
  if (!payload) return
  emit('submit', payload)
}

function money(amount: string | undefined | null) {
  return formatMoney(amount, props.currency, locale.value)
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('contracts.vacate.title')"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField :label="$t('contracts.vacate.moveOutDate')">
          <UCalendar
            v-model="moveOut"
            class="w-full"
          />
        </UFormField>

        <div class="space-y-3">
          <p class="text-sm font-medium text-highlighted">
            {{ $t('contracts.deposit.title') }}
            <span class="text-muted font-normal">
              ({{ money(depositAmount) }})
            </span>
          </p>

          <URadioGroup
            v-model="outcome"
            :items="outcomeItems"
            value-key="value"
            label-key="label"
          />

          <div
            v-if="outcome === 'deducted'"
            class="space-y-3"
          >
            <div
              v-for="(line, index) in deductions"
              :key="index"
              class="flex flex-col gap-2 sm:flex-row"
            >
              <UInput
                v-model="line.amount"
                type="number"
                step="0.01"
                min="0"
                :placeholder="$t('contracts.deposit.amount')"
                class="sm:w-32"
              />
              <UInput
                v-model="line.reason"
                :placeholder="$t('contracts.deposit.reason')"
                class="flex-1"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                @click="removeDeduction(index)"
              />
            </div>
            <div class="flex items-center justify-between text-sm">
              <UButton
                :label="$t('contracts.deposit.addDeduction')"
                color="neutral"
                variant="outline"
                size="sm"
                @click="addDeduction"
              />
              <span class="text-muted">
                {{ $t('contracts.deposit.remainder', { amount: money(String(remainder.toFixed(2))) }) }}
              </span>
            </div>
          </div>

          <UFormField
            v-if="outcome === 'forfeited'"
            :label="$t('contracts.deposit.forfeitReason')"
          >
            <UInput
              v-model="forfeitReason"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="rounded-lg border border-default p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-highlighted">
              {{ $t('contracts.vacate.previewTitle') }}
            </p>
            <UIcon
              v-if="previewPending"
              name="i-lucide-loader-circle"
              class="size-4 animate-spin text-muted"
            />
          </div>

          <template v-if="preview">
            <dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-muted">
                  {{ $t('contracts.vacate.finalBillingDate') }}
                </dt>
                <dd>{{ preview.final_billing_date }}</dd>
              </div>
              <div>
                <dt class="text-muted">
                  {{ $t('contracts.vacate.resultingBalance') }}
                </dt>
                <dd>{{ money(preview.resulting_balance) }}</dd>
              </div>
            </dl>

            <ul
              v-if="preview.item_lines.length"
              class="space-y-1 text-sm"
            >
              <li
                v-for="(line, i) in preview.item_lines"
                :key="i"
                class="flex justify-between gap-2"
              >
                <span class="text-muted">{{ line.description }} ({{ line.item_type }})</span>
                <span>{{ money(line.gross) }}</span>
              </li>
            </ul>

            <ul
              v-if="preview.deposit.lines.length"
              class="space-y-1 text-sm"
            >
              <li
                v-for="(line, i) in preview.deposit.lines"
                :key="`d-${i}`"
                class="flex justify-between gap-2"
              >
                <span class="text-muted">{{ line.reason }}</span>
                <span>{{ money(line.gross) }}</span>
              </li>
            </ul>

            <p
              v-if="Number(preview.payout_amount) > 0"
              class="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-highlighted"
            >
              {{ $t('contracts.vacate.payoutDue', { amount: money(preview.payout_amount) }) }}
            </p>

            <div
              v-if="preview.invoices_to_issue?.length"
              class="rounded-md border border-default px-3 py-2 text-sm"
            >
              <p class="mb-1 font-medium text-highlighted">
                {{ $t('billing.invoices.rectificative.invoicesToIssue') }}
              </p>
              <ul class="space-y-1">
                <li
                  v-for="(inv, i) in preview.invoices_to_issue"
                  :key="i"
                  class="flex justify-between gap-2"
                >
                  <span class="text-muted">
                    <template v-if="inv.rectifies_full_number">
                      {{ $t('billing.invoices.rectificative.rectifies') }}
                      {{ inv.rectifies_full_number }}
                    </template>
                    <template v-else>
                      {{ $t('billing.invoices.rectificative.ordinaryDebit') }}
                    </template>
                  </span>
                  <span :class="Number(inv.gross_total) < 0 ? 'text-error' : ''">
                    {{ money(inv.gross_total) }}
                  </span>
                </li>
              </ul>
            </div>
          </template>

          <p
            v-else
            class="text-sm text-muted"
          >
            {{ $t('contracts.vacate.previewEmpty') }}
          </p>
        </div>

        <p class="text-sm text-muted">
          {{ $t('contracts.vacate.inventoryNote') }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="$t('contracts.vacate.confirm')"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
