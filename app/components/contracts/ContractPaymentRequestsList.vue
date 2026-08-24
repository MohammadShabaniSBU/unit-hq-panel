<script setup lang="ts">
import { formatMoney } from '~/composables/useMoney'
import type { ApiPaymentRequest, PaymentRequestStatus } from '~/types/paymentRequest'

const props = defineProps<{
  requests: Array<ApiPaymentRequest>
  pending?: boolean
  currency: string
  cancelling?: boolean
}>()

const emit = defineEmits<{
  cancel: [id: number]
  copy: [url: string]
}>()

const { t, locale } = useI18n()
const { formatDateTime } = useOrgDateFormat()

function statusColor(status: PaymentRequestStatus, expired: boolean): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
  if (expired && status === 'pending') return 'warning'
  switch (status) {
    case 'paid': return 'success'
    case 'cancelled': return 'neutral'
    case 'processing': return 'info'
    default: return 'warning'
  }
}

function statusLabel(request: ApiPaymentRequest): string {
  if (request.expired && request.status === 'pending') {
    return t('billing.paymentRequests.statuses.expired')
  }
  return t(`billing.paymentRequests.statuses.${request.status}`)
}

function formatAmount(amount: string, currency?: string) {
  return formatMoney(amount, currency ?? props.currency, locale.value)
}

function absoluteUrl(request: ApiPaymentRequest): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${request.url}`
}

function canCancel(request: ApiPaymentRequest): boolean {
  return request.status === 'pending' && !request.expired
}
</script>

<template>
  <div class="mt-4 border-t border-default pt-4">
    <h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('billing.paymentRequests.listTitle') }}
    </h3>

    <p
      v-if="pending"
      class="text-sm text-dimmed"
    >
      {{ $t('billing.paymentRequests.loading') }}
    </p>

    <p
      v-else-if="requests.length === 0"
      class="text-sm text-dimmed"
    >
      {{ $t('billing.paymentRequests.empty') }}
    </p>

    <ul
      v-else
      class="divide-y divide-default rounded-lg border border-default"
    >
      <li
        v-for="request in requests"
        :key="request.id"
        class="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              size="sm"
              variant="subtle"
              :color="statusColor(request.status, request.expired)"
              :label="statusLabel(request)"
            />
            <span class="text-sm font-medium text-highlighted">
              {{ formatAmount(request.amount, request.currency) }}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-dimmed">
            {{ $t('billing.paymentRequests.expires') }}: {{ formatDateTime(request.expires_at) }}
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-copy"
            :label="$t('billing.paymentRequests.copyLink')"
            @click="emit('copy', absoluteUrl(request))"
          />
          <UButton
            v-if="canCancel(request)"
            size="xs"
            color="error"
            variant="ghost"
            :label="$t('billing.paymentRequests.cancel')"
            :loading="cancelling"
            @click="emit('cancel', request.id)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
