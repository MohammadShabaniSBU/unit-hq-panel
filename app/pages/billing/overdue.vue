<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import type { ApiOverdueContract } from '~/types/billing'

const { t, locale } = useI18n()
const UBadge = resolveComponent('UBadge')

const {
  contracts,
  failedAutopayCount,
  failedOnly,
  pending,
  error,
  refresh
} = useBillingOverdue()

function contractLabel(row: ApiOverdueContract): string {
  const unit = row.unit_number
  const name = row.contact_name
  if (unit && name) return `${unit} · ${name}`
  if (name) return name
  if (unit) return unit
  return `#${row.id}`
}

const columns = computed<Array<TableColumn<ApiOverdueContract>>>(() => [
  {
    id: 'contract',
    header: t('billing.overdue.columns.contract'),
    cell: ({ row }) => h('a', {
      class: 'font-medium text-highlighted hover:underline',
      href: `/leasing/contracts/${row.original.id}`,
      onClick: (e: Event) => {
        e.preventDefault()
        navigateTo(`/leasing/contracts/${row.original.id}`)
      }
    }, contractLabel(row.original))
  },
  {
    id: 'contact',
    header: t('billing.overdue.columns.contact'),
    cell: ({ row }) => h('span', {}, row.original.contact_name ?? t('common.emptyValue'))
  },
  {
    id: 'unit',
    header: t('billing.overdue.columns.unit'),
    cell: ({ row }) => h('span', {}, row.original.unit_number ?? t('common.emptyValue'))
  },
  {
    id: 'overdue',
    header: t('billing.overdue.columns.overdue'),
    cell: ({ row }) => h('span', { class: 'tabular-nums text-error' }, formatMoney(
      row.original.overdue_amount,
      row.original.currency,
      locale.value
    ))
  },
  {
    id: 'autopay',
    header: t('billing.overdue.columns.autopay'),
    cell: ({ row }) => {
      if (row.original.failed_autopay) {
        return h(UBadge, {
          label: t('billing.autopay.statuses.failed'),
          color: 'warning',
          variant: 'subtle',
          size: 'sm'
        })
      }
      if (row.original.autopay_enabled) {
        return h(UBadge, {
          label: t('billing.autopay.enabled'),
          color: 'success',
          variant: 'subtle',
          size: 'sm'
        })
      }
      return h('span', { class: 'text-dimmed' }, t('billing.autopay.disabled'))
    }
  }
])
</script>

<template>
  <UContainer class="py-8">
    <UPageHeader
      :title="$t('billing.overdue.title')"
      :description="$t('billing.overdue.subtitle')"
    >
      <template #links>
        <UButton
          v-if="failedAutopayCount > 0"
          color="warning"
          variant="soft"
          :label="$t('billing.autopay.failedCount', { count: failedAutopayCount })"
          @click="failedOnly = !failedOnly"
        />
      </template>
    </UPageHeader>

    <div
      v-if="failedOnly"
      class="mt-4"
    >
      <UButton
        size="sm"
        variant="ghost"
        :label="$t('billing.autopay.showAll')"
        @click="failedOnly = false"
      />
    </div>

    <div
      v-if="error"
      class="mt-6"
    >
      <UAlert
        color="error"
        variant="subtle"
        :title="$t('billing.overdue.loadError')"
        :actions="[{
          label: $t('common.retry'),
          onClick: () => refresh()
        }]"
      />
    </div>

    <div
      v-else-if="pending"
      class="mt-6 text-sm text-dimmed"
    >
      {{ $t('contacts.paymentMethods.loading') }}
    </div>

    <div
      v-else-if="!contracts.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('billing.overdue.emptyTitle') }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ $t('billing.overdue.emptyBody') }}
      </p>
    </div>

    <UTable
      v-else
      class="mt-6"
      :data="contracts"
      :columns="columns"
    />
  </UContainer>
</template>
