<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { getLocalTimeZone, today } from '@internationalized/date'
import { formatMoney } from '~/composables/useMoney'
import type { ApiOption, ApiUnitOption } from '~/types/facility'
import type {
  TransferPayload,
  TransferPreview,
  TransferPricingMode
} from '~/types/contract'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  originAmount: string
  currency: string
  submitting?: boolean
  previewPending?: boolean
  preview: TransferPreview | null
}>()

const emit = defineEmits<{
  preview: [payload: TransferPayload]
  submit: [payload: TransferPayload]
}>()

const { t, locale } = useI18n()
const { get } = useApi()

const siteId = ref<number | undefined>(undefined)
const unitClassId = ref<number | undefined>(undefined)
const toUnitId = ref<number | undefined>(undefined)
const transferDate = shallowRef<CalendarDate | null>(null)
const pricingMode = ref<TransferPricingMode>('destination_rate')
const reason = ref('')

const { items: siteItems } = useOptions('/api/sites/options')

const { data: unitClassOptionsData, pending: unitClassPending } = useAsyncData(
  () => `transfer:unit-class-options:${siteId.value ?? 'none'}`,
  async () => {
    if (!siteId.value) return null
    return get<ApiOption[]>('/api/unit-classes/options', { site_id: siteId.value })
  },
  { watch: [siteId] }
)

const unitClassItems = computed(() => unitClassOptionsData.value?.data ?? [])

const { data: unitOptionsData, pending: unitPending } = useAsyncData(
  () => `transfer:unit-options:${siteId.value ?? 'none'}:${unitClassId.value ?? 'none'}`,
  async () => {
    if (!siteId.value || !unitClassId.value) return null
    return get<ApiUnitOption[]>('/api/units/options', {
      site_id: siteId.value,
      unit_class_id: unitClassId.value
    })
  },
  { watch: [siteId, unitClassId] }
)

const unitItems = computed(() => unitOptionsData.value?.data ?? [])

const selectedUnit = computed(() =>
  unitItems.value.find(u => u.value === toUnitId.value) ?? null
)

const destinationRate = computed(() => selectedUnit.value?.price_amount ?? null)

const pricingItems = computed(() => [
  {
    value: 'destination_rate' as const,
    label: t('contracts.transfer.pricing.destination_rate', {
      amount: money(destinationRate.value ?? '—')
    })
  },
  {
    value: 'retain_rate' as const,
    label: t('contracts.transfer.pricing.retain_rate', {
      amount: money(props.originAmount)
    })
  }
])

watch(open, (isOpen) => {
  if (!isOpen) return
  siteId.value = undefined
  unitClassId.value = undefined
  toUnitId.value = undefined
  transferDate.value = today(getLocalTimeZone())
  pricingMode.value = 'destination_rate'
  reason.value = ''
})

watch(siteId, () => {
  unitClassId.value = undefined
  toUnitId.value = undefined
})

watch(unitClassId, () => {
  toUnitId.value = undefined
})

watch([toUnitId, transferDate, pricingMode, reason], () => {
  if (open.value) emitPreview()
})

function toIso(date: CalendarDate | null): string | null {
  if (!date) return null
  const y = String(date.year).padStart(4, '0')
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildPayload(): TransferPayload | null {
  const date = toIso(transferDate.value)
  if (!toUnitId.value || !date) return null

  return {
    to_unit_id: toUnitId.value,
    transfer_date: date,
    pricing_mode: pricingMode.value,
    reason: reason.value.trim() || null
  }
}

function emitPreview() {
  const payload = buildPayload()
  if (!payload) return
  emit('preview', payload)
}

function onSubmit() {
  const payload = buildPayload()
  if (!payload) return
  emit('submit', payload)
}

function money(amount: string | undefined | null) {
  if (amount === '—' || amount == null || amount === '') return '—'
  return formatMoney(amount, props.currency, locale.value)
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('contracts.transfer.title')"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField :label="$t('contracts.transfer.site')">
          <USelectMenu
            v-model="siteId"
            :items="siteItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('contracts.transfer.sitePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('contracts.transfer.unitClass')">
          <USelectMenu
            v-model="unitClassId"
            :items="unitClassItems"
            value-key="value"
            label-key="label"
            :disabled="!siteId"
            :loading="unitClassPending"
            :placeholder="$t('contracts.transfer.unitClassPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('contracts.transfer.unit')">
          <USelectMenu
            v-model="toUnitId"
            :items="unitItems"
            value-key="value"
            label-key="label"
            :disabled="!unitClassId"
            :loading="unitPending"
            :placeholder="$t('contracts.transfer.unitPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('contracts.transfer.transferDate')">
          <UCalendar
            v-model="transferDate"
            class="w-full"
          />
        </UFormField>

        <div class="space-y-3">
          <p class="text-sm font-medium text-highlighted">
            {{ $t('contracts.transfer.pricingMode') }}
          </p>
          <URadioGroup
            v-model="pricingMode"
            :items="pricingItems"
            value-key="value"
            label-key="label"
          />
        </div>

        <UFormField :label="$t('contracts.transfer.reason')">
          <UTextarea
            v-model="reason"
            :placeholder="$t('contracts.transfer.reasonPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="space-y-3 rounded-lg border border-default p-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-highlighted">
              {{ $t('contracts.transfer.previewTitle') }}
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
                  {{ $t('contracts.transfer.credit') }}
                </dt>
                <dd>{{ money(preview.credit?.gross ?? '0.00') }}</dd>
              </div>
              <div>
                <dt class="text-muted">
                  {{ $t('contracts.transfer.debit') }}
                </dt>
                <dd>{{ money(preview.debit?.gross ?? '0.00') }}</dd>
              </div>
              <div>
                <dt class="text-muted">
                  {{ $t('contracts.transfer.depositDifferential') }}
                </dt>
                <dd>{{ money(preview.deposit.differential) }}</dd>
              </div>
              <div>
                <dt class="text-muted">
                  {{ $t('contracts.transfer.newRate') }}
                </dt>
                <dd>{{ money(preview.destination_item.amount) }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-muted">
                  {{ $t('contracts.transfer.resultingBalance') }}
                </dt>
                <dd class="font-medium text-highlighted">
                  {{ money(preview.resulting_balance) }}
                </dd>
              </div>
            </dl>
            <p
              v-if="Number(preview.deposit.surplus) > 0"
              class="text-sm text-muted"
            >
              {{ $t('contracts.transfer.depositSurplusNote', { amount: money(preview.deposit.surplus) }) }}
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
            {{ $t('contracts.transfer.previewEmpty') }}
          </p>
        </div>
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
          :label="$t('contracts.transfer.confirm')"
          :loading="submitting"
          :disabled="!toUnitId"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
