<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiTemplateFamily } from '~/types/email-builder'

const { t } = useI18n()

function openEditor(family: ApiTemplateFamily) {
  navigateTo(`/marketing/templates/email/${family.id}`)
}

const {
  families,
  totalCount,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  searchQuery,
  pending,
  error,
  refresh,
  deleteTemplate
} = useEmailTemplatesList()

const showCreateModal = ref(false)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

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
    cell: ({ row }) => formatDate(row.original.updated_at)
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
        'aria-label': t('common.actions')
      })
    })
  }
])

function openRow(_event: Event, row: TableRow<ApiTemplateFamily>) {
  openEditor(row.original)
}

function onCreated(templateId: number) {
  navigateTo(`/marketing/templates/email/${templateId}`)
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('templates.builder.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('templates.builder.subtitle') }}
        </p>
      </div>
      <UButton
        :label="$t('templates.builder.newTemplate')"
        icon="i-lucide-plus"
        @click="showCreateModal = true"
      />
    </div>

    <div class="mt-6 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('templates.builder.search')"
          class="max-w-xs"
        />
        <span class="text-sm text-dimmed">
          {{ totalCount }} {{ $t('templates.builder.totalTemplates') }}
        </span>
      </div>

      <div
        v-if="error"
        class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
      >
        {{ $t('templates.builder.loadError') }}
        <UButton
          class="ml-2"
          size="xs"
          color="neutral"
          variant="outline"
          @click="refresh()"
        >
          {{ $t('common.retry') }}
        </UButton>
      </div>

      <UTable
        v-else
        :data="families"
        :columns="columns"
        :loading="pending"
        class="cursor-pointer"
        @select="openRow"
      >
        <template #empty>
          <div class="py-10 text-center text-sm text-dimmed">
            {{ $t('templates.builder.empty') }}
          </div>
        </template>
      </UTable>

      <div
        v-if="lastPage > 1"
        class="flex items-center justify-end gap-2"
      >
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          size="sm"
          square
          :disabled="!canGoPrev"
          @click="page--"
        />
        <span class="text-sm text-dimmed">
          {{ page }} / {{ lastPage }}
        </span>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          size="sm"
          square
          :disabled="!canGoNext"
          @click="page++"
        />
      </div>
    </div>

    <EmailBuilderTemplateCreateModal
      v-model:open="showCreateModal"
      @created="onCreated"
    />
  </div>
</template>
