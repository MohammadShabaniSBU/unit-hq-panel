<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiEmailTemplate } from '~/types/email-builder'

const { t } = useI18n()

function openEditor(template: ApiEmailTemplate) {
  navigateTo(`/marketing/email-builder/${template.id}`)
}
const {
  templates,
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
const UDropdownMenu = resolveComponent('UDropdownMenu')

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const columns = computed<Array<TableColumn<ApiEmailTemplate>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    id: 'blocks',
    header: t('forms.emailTemplate.blocks'),
    cell: ({ row }) => `${row.original.blocks.length} ${t('forms.emailTemplate.blocksCount')}`
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
          label: t('forms.emailTemplate.edit'),
          icon: 'i-lucide-pencil',
          onSelect() { openEditor(row.original) }
        },
        {
          label: t('forms.emailTemplate.delete'),
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

function openRow(_event: Event, row: TableRow<ApiEmailTemplate>) {
  openEditor(row.original)
}

function onCreated(templateId: number) {
  navigateTo(`/marketing/email-builder/${templateId}`)
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.emailBuilder.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.emailBuilder.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.emailBuilder.search')"
          class="w-full sm:w-72"
        />
        <UButton
          :label="$t('pages.emailBuilder.newTemplate')"
          icon="i-lucide-plus"
          @click="showCreateModal = true"
        />
      </div>
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
        {{ $t('pages.emailBuilder.loadError') }}
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

    <template v-else>
      <div
        v-if="templates.length === 0 && !searchQuery"
        class="mt-12 flex flex-col items-center gap-3 text-center"
      >
        <UIcon
          name="i-lucide-mail"
          class="size-10 text-dimmed"
        />
        <p class="text-sm text-dimmed">
          {{ $t('pages.emailBuilder.empty') }}
        </p>
        <UButton
          :label="$t('pages.emailBuilder.newTemplate')"
          icon="i-lucide-plus"
          @click="showCreateModal = true"
        />
      </div>

      <div
        v-else
        class="mt-6 overflow-hidden rounded-lg border border-default"
      >
        <UTable
          :data="templates"
          :columns="columns"
          @select="openRow"
        />
      </div>

      <div
        v-if="lastPage > 1"
        class="mt-4 flex items-center justify-between text-sm text-dimmed"
      >
        <span>{{ totalCount }} {{ $t('forms.emailTemplate.totalTemplates') }}</span>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :disabled="!canGoPrev"
            :aria-label="$t('common.previousPage')"
            @click="page--"
          />
          <span>{{ page }} / {{ lastPage }}</span>
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :disabled="!canGoNext"
            :aria-label="$t('common.nextPage')"
            @click="page++"
          />
        </div>
      </div>
    </template>

    <EmailBuilderTemplateCreateModal
      v-model:open="showCreateModal"
      @created="onCreated"
    />
  </div>
</template>
