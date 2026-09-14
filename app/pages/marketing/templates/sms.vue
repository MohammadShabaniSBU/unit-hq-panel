<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiTemplateFamily } from '~/types/email-builder'

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const UBadge = resolveComponent('UBadge')

const {
  families,
  totalCount,
  showingCount,
  page,
  perPage,
  lastPage,
  canGoPrev,
  canGoNext,
  searchQuery,
  pending,
  error,
  refresh,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useSmsTemplatesList()

const columns = computed<Array<TableColumn<ApiTemplateFamily>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    id: 'purpose',
    header: t('templates.builder.purpose'),
    cell: ({ row }) => row.original.purpose
  },
  {
    id: 'locales',
    header: t('templates.builder.locales'),
    cell: ({ row }) => h(
      'div',
      { class: 'flex flex-wrap gap-1' },
      row.original.locales.map(locale =>
        h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => locale)
      )
    )
  },
  {
    id: 'usage_count',
    header: t('templates.builder.usage'),
    cell: ({ row }) => String(row.original.usage_count)
  },
  {
    id: 'updated_at',
    header: t('table.lastActivity'),
    cell: ({ row }) => formatDateTime(row.original.updated_at)
  }
])
</script>

<template>
  <UContainer class="flex h-[calc(100svh-4rem)] flex-col overflow-hidden py-8">
    <div class="shrink-0">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('templates.sms.title') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('templates.sms.subtitle') }}
      </p>
    </div>

    <div class="mt-6 flex shrink-0 items-center gap-3">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('templates.sms.search')"
        class="max-w-xs"
      />
    </div>

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('templates.sms.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="!families.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('templates.sms.empty') }}
      </p>
    </div>

    <template v-else>
      <div class="mt-6 min-h-0 flex-1">
        <UTable
          :data="families"
          :columns="columns"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        class="shrink-0"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>
  </UContainer>
</template>
