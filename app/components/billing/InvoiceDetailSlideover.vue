<script setup lang="ts">
import type { ApiInvoice } from '~/types/invoice'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  invoiceId: number | null
}>()

const emit = defineEmits<{
  navigate: [invoiceId: number]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const invoiceIdRef = computed(() => props.invoiceId)
const { invoice, pending, error, refresh, openPdf, rectify } = useInvoice(invoiceIdRef)
const rectifying = ref(false)

function formatAmount(amount: string | null | undefined, currency?: string | null) {
  return formatMoney(amount, currency ?? invoice.value?.currency, locale.value)
}

function isNegative(amount: string | null | undefined) {
  return amount != null && Number(amount) < 0
}

function kindLabel(kind: ApiInvoice['kind']) {
  return t(`billing.invoices.kinds.${kind}`)
}

function reasonLabel(reason: string | null | undefined) {
  if (!reason) {
    return null
  }
  const key = `billing.invoices.rectificative.reasons.${reason}`
  return t(key) !== key ? t(key) : reason
}

function paymentStatusLabel(status: ApiInvoice['payment_status']) {
  if (!status) return null
  return t(`billing.invoices.paymentStatus.${status}`)
}

function paymentStatusColor(status: ApiInvoice['payment_status']): 'error' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    case 'unpaid':
      return 'error'
    default:
      return 'neutral'
  }
}

async function onRectify() {
  rectifying.value = true
  try {
    const created = await rectify('operator_correction')
    toast.add({
      title: t('billing.invoices.rectificative.rectifySuccess'),
      color: 'success'
    })
    if (created?.id) {
      emit('navigate', created.id)
    } else {
      await refresh()
    }
  } catch {
    toast.add({
      title: t('billing.invoices.rectificative.rectifyError'),
      color: 'error'
    })
  } finally {
    rectifying.value = false
  }
}

const canRectify = computed(() => {
  return invoice.value != null
    && invoice.value.status === 'issued'
    && invoice.value.kind !== undefined
})
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="invoice?.full_number ?? $t('billing.invoices.detailTitle')"
  >
    <template #body>
      <div
        v-if="pending"
        class="flex justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        :title="$t('billing.invoices.loadError')"
        :actions="[{
          label: $t('common.retry'),
          color: 'neutral',
          variant: 'outline',
          onClick: () => refresh()
        }]"
      />

      <div
        v-else-if="invoice"
        class="space-y-6"
      >
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :label="invoice.kind === 'rectificative' ? 'R' : kindLabel(invoice.kind)"
            :color="invoice.kind === 'rectificative' ? 'warning' : 'neutral'"
            variant="subtle"
          />
          <UBadge
            v-if="invoice.payment_status"
            :label="paymentStatusLabel(invoice.payment_status) ?? ''"
            :color="paymentStatusColor(invoice.payment_status)"
            variant="subtle"
          />
          <span class="text-sm text-muted">
            {{ invoice.issue_date }}
          </span>
        </div>

        <p
          v-if="invoice.rectifies_invoice"
          class="text-sm"
        >
          <span class="text-muted">{{ $t('billing.invoices.rectificative.rectifies') }}</span>
          <button
            type="button"
            class="ml-1 font-medium text-primary hover:underline"
            @click="emit('navigate', invoice.rectifies_invoice.id)"
          >
            {{ invoice.rectifies_invoice.full_number }}
          </button>
        </p>

        <p
          v-if="invoice.rectification_reason"
          class="text-sm text-muted"
        >
          {{ $t('billing.invoices.rectificative.reason') }}:
          {{ reasonLabel(invoice.rectification_reason) }}
        </p>

        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-muted">
              {{ $t('billing.invoices.buyer') }}
            </dt>
            <dd class="font-medium">
              {{ invoice.buyer_name || invoice.contact?.name || '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('billing.invoices.contract') }}
            </dt>
            <dd class="font-medium">
              {{ invoice.contract_id ? `#${invoice.contract_id}` : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('billing.invoices.net') }}
            </dt>
            <dd :class="isNegative(invoice.net_total) ? 'text-error' : ''">
              {{ formatAmount(invoice.net_total) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('billing.invoices.tax') }}
            </dt>
            <dd :class="isNegative(invoice.tax_total) ? 'text-error' : ''">
              {{ formatAmount(invoice.tax_total) }}
            </dd>
          </div>
          <div class="col-span-2">
            <dt class="text-muted">
              {{ $t('billing.invoices.total') }}
            </dt>
            <dd
              class="text-base font-semibold"
              :class="isNegative(invoice.gross_total) ? 'text-error' : ''"
            >
              {{ formatAmount(invoice.gross_total) }}
            </dd>
          </div>
        </dl>

        <div v-if="invoice.rectificatives?.length">
          <h3 class="mb-2 text-sm font-medium">
            {{ $t('billing.invoices.rectificative.children') }}
          </h3>
          <ul class="divide-y divide-default rounded-lg border border-default">
            <li
              v-for="child in invoice.rectificatives"
              :key="child.id"
              class="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <button
                type="button"
                class="font-medium text-primary hover:underline"
                @click="emit('navigate', child.id)"
              >
                {{ child.full_number }}
              </button>
              <span
                class="tabular-nums"
                :class="isNegative(child.gross_total) ? 'text-error' : ''"
              >
                {{ formatAmount(child.gross_total, invoice.currency) }}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="mb-2 text-sm font-medium">
            {{ $t('billing.invoices.lines') }}
          </h3>
          <ul class="divide-y divide-default rounded-lg border border-default">
            <li
              v-for="line in invoice.lines ?? []"
              :key="line.id"
              class="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div class="font-medium">
                  {{ line.description }}
                </div>
                <div
                  v-if="line.period_start && line.period_end"
                  class="text-xs text-muted"
                >
                  {{ line.period_start }} – {{ line.period_end }}
                </div>
              </div>
              <div
                class="text-right tabular-nums"
                :class="isNegative(line.gross_amount) ? 'text-error' : ''"
              >
                {{ formatAmount(line.gross_amount) }}
              </div>
            </li>
          </ul>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-lucide-file-down"
            :label="$t('billing.invoices.downloadPdf')"
            @click="openPdf"
          />
          <UButton
            v-if="canRectify"
            color="neutral"
            variant="outline"
            icon="i-lucide-file-minus-2"
            :label="$t('billing.invoices.rectificative.rectify')"
            :loading="rectifying"
            @click="onRectify"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
