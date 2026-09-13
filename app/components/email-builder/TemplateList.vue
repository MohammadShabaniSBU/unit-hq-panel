<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiTemplateFamily, TemplateBuilderChannel } from '~/types/email-builder'

const props = withDefaults(defineProps<{
  channel?: TemplateBuilderChannel
}>(), {
  channel: 'email'
})

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()

function openEditor(family: ApiTemplateFamily) {
  const base = props.channel === 'document'
    ? '/marketing/templates/documents'
    : '/marketing/templates/email'
  navigateTo(`${base}/${family.id}`)
}

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
  deleteTemplate,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useEmailTemplatesList(props.channel)

const showCreateModal = ref(false)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const emptyMessage = computed(() =>
  props.channel === 'document'
    ? t('templates.builder.documentsEmpty')
    : t('templates.builder.empty')
)

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
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-10', td: 'w-10 text-right' } },
    cell: ({ row }) => h(UDropdownMenu, {
      items: [[
        {
          label: t('templates.builder.edit'),
          icon: 'i-lucide-pencil',
          onSelect() { openEditor(row.original) }
        },
        {
          label: t('templates.builder.delete'),
          icon: 'i-lucide-trash-2',
          color: 'error' as const,
          onSelect() { deleteTemplate(row.original.id) }
        }
      ]],
      content: { align: 'end' }
    }, {
      default: () => h(UButton, {
        icon: 'i-lucide-ellipsis',
        color: 'neutral',
        variant: 'ghost',
        size: 'sm',
        square: true,
        'aria-label': t('common.actions'),
        onClick: (event: Event) => event.stopPropagation()
      })
    })
  }
])

function openRow(_event: Event, row: TableRow<ApiTemplateFamily>) {
  openEditor(row.original)
}

function onCreated(templateId: number) {
  const base = props.channel === 'document'
    ? '/marketing/templates/documents'
    : '/marketing/templates/email'
  navigateTo(`${base}/${templateId}`)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ channel === 'document' ? $t('templates.builder.documentsTitle') : $t('templates.builder.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ channel === 'document' ? $t('templates.builder.documentsSubtitle') : $t('templates.builder.subtitle') }}
        </p>
      </div>
      <UButton
        :label="$t('templates.builder.newTemplate')"
        icon="i-lucide-plus"
        class="shrink-0"
        @click="showCreateModal = true"
      />
    </div>

    <div class="mt-6 flex shrink-0 items-center gap-3">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('templates.builder.search')"
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
        {{ $t('templates.builder.loadError') }}
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
        {{ emptyMessage }}
      </p>
      <UButton
        class="mt-4"
        icon="i-lucide-plus"
        :label="$t('templates.builder.newTemplate')"
        @click="showCreateModal = true"
      />
    </div>

    <template v-else>
      <div class="mt-6 min-h-0 flex-1 overflow-hidden rounded-lg border border-default">
        <UTable
          :data="families"
          :columns="columns"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="openRow"
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

    <EmailBuilderTemplateCreateModal
      v-model:open="showCreateModal"
      :channel="channel"
      @created="onCreated"
    />
  </div>
</template>
