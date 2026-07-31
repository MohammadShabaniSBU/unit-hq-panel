<script setup lang="ts">
import type { ApiInvoice } from '~/types/invoice'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  invoiceId: number | null
}>()

const { t, locale } = useI18n()
const invoiceIdRef = computed(() => props.invoiceId)
const { invoice, pending, error, refresh, openPdf } = useInvoice(invoiceIdRef)

function formatAmount(amount: string | null | undefined, currency?: string | null) {
  return formatMoney(amount, currency ?? invoice.value?.currency, locale.value)
}

function kindLabel(kind: ApiInvoice['kind']) {
  return t(`billing.invoices.kinds.${kind}`)
}
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
            :label="kindLabel(invoice.kind)"
            color="neutral"
            variant="subtle"
          />
          <span class="text-sm text-muted">
            {{ invoice.issue_date }}
          </span>
        </div>

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
            <dd>{{ formatAmount(invoice.net_total) }}</dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('billing.invoices.tax') }}
            </dt>
            <dd>{{ formatAmount(invoice.tax_total) }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-muted">
              {{ $t('billing.invoices.total') }}
            </dt>
            <dd class="text-base font-semibold">
              {{ formatAmount(invoice.gross_total) }}
            </dd>
          </div>
        </dl>

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
              <div class="text-right tabular-nums">
                {{ formatAmount(line.gross_amount) }}
              </div>
            </li>
          </ul>
        </div>

        <UButton
          icon="i-lucide-file-down"
          :label="$t('billing.invoices.downloadPdf')"
          @click="openPdf"
        />
      </div>
    </template>
  </USlideover>
</template>
