<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiWhatsappTemplate, WhatsappTemplateStatus } from '~/types/whatsapp-template'

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const showCreateModal = ref(false)

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const {
  templates,
  totalCount,
  showingCount,
  page,
  perPage,
  lastPage,
  canGoPrev,
  canGoNext,
  searchQuery,
  statusFilter,
  pending,
  error,
  refresh,
  syncTemplates,
  archiveTemplate,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useWhatsappTemplatesList()

const statusOptions = computed(() => [
  { label: t('templates.whatsapp.filterActive'), value: 'active' },
  { label: t('templates.whatsapp.status.draft'), value: 'draft' },
  { label: t('templates.whatsapp.status.submitted'), value: 'submitted' },
  { label: t('templates.whatsapp.status.approved'), value: 'approved' },
  { label: t('templates.whatsapp.status.rejected'), value: 'rejected' },
  { label: t('templates.whatsapp.status.revoked'), value: 'revoked' },
  { label: t('templates.whatsapp.filterAll'), value: 'all' }
])

function statusColor(status: WhatsappTemplateStatus): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'approved': return 'success'
    case 'submitted': return 'info'
    case 'rejected':
    case 'revoked': return 'error'
    case 'draft': return 'warning'
    default: return 'neutral'
  }
}

function openEditor(row: ApiWhatsappTemplate) {
  navigateTo(`/marketing/templates/whatsapp/${row.id}`)
}

function onRowSelect(_event: Event, row: TableRow<ApiWhatsappTemplate>) {
  openEditor(row.original)
}

function onCreated(id: number) {
  navigateTo(`/marketing/templates/whatsapp/${id}`)
}

const columns = computed<Array<TableColumn<ApiWhatsappTemplate>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    id: 'language',
    header: t('templates.whatsapp.language'),
    cell: ({ row }) => h(UBadge, {
      color: 'neutral',
      variant: 'subtle',
      size: 'sm'
    }, () => row.original.language)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const children = [
        h(UBadge, {
          color: statusColor(row.original.status),
          variant: 'subtle',
          size: 'sm'
        }, () => t(`templates.whatsapp.status.${row.original.status}`))
      ]

      if (row.original.status === 'rejected' && row.original.rejection_reason) {
        children.push(h('p', { class: 'mt-1 text-xs text-error' }, row.original.rejection_reason))
      }

      return h('div', {}, children)
    }
  },
  {
    id: 'category',
    header: t('templates.whatsapp.categoryLabel'),
    cell: ({ row }) => t(`templates.whatsapp.category.${row.original.category.toLowerCase()}`)
  },
  {
    id: 'submitted_at',
    header: t('templates.whatsapp.submittedAt'),
    cell: ({ row }) => formatDateTime(row.original.submitted_at)
  },
  {
    id: 'decided_at',
    header: t('templates.whatsapp.decidedAt'),
    cell: ({ row }) => formatDateTime(row.original.decided_at)
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-10', td: 'w-10 text-right' } },
    cell: ({ row }) => {
      if (row.original.status === 'archived') {
        return null
      }

      return h(UButton, {
        size: 'xs',
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-archive',
        'aria-label': t('templates.whatsapp.archive'),
        onClick: (event: Event) => {
          event.stopPropagation()
          archiveTemplate(row.original.id)
        }
      })
    }
  }
])
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('templates.whatsapp.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('templates.whatsapp.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :label="$t('templates.whatsapp.sync')"
          @click="syncTemplates"
        />
        <UButton
          icon="i-lucide-plus"
          class="shrink-0"
          :label="$t('templates.whatsapp.newTemplate')"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <div class="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('templates.whatsapp.search')"
        class="w-full sm:max-w-xs"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        class="w-full sm:w-48"
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
        {{ $t('templates.whatsapp.loadError') }}
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
      v-else-if="!templates.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('templates.whatsapp.empty') }}
      </p>
      <UButton
        class="mt-4"
        icon="i-lucide-plus"
        :label="$t('templates.whatsapp.newTemplate')"
        @click="showCreateModal = true"
      />
    </div>

    <template v-else>
      <div class="mt-6 min-h-0 flex-1 overflow-hidden rounded-lg border border-default">
        <UTable
          :data="templates"
          :columns="columns"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="onRowSelect"
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

    <WhatsappTemplatesCreateModal
      v-model:open="showCreateModal"
      @created="onCreated"
    />
  </div>
</template>
