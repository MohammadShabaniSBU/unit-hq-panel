<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { Playbook, PlaybookKind } from '~/types/playbook'
import { playbookKindConfig } from '~/config/playbookKinds'

const props = defineProps<{
  kind: PlaybookKind
}>()

const { t } = useI18n()
const config = computed(() => playbookKindConfig(props.kind))
const {
  playbooks,
  pending,
  error,
  refresh,
  createPlaybook,
  archivePlaybook,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  searchQuery
} = usePlaybookList(() => props.kind)

const { formatDateTime } = useOrgDateFormat()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const showCreate = ref(false)
const createName = ref('')
const creating = ref(false)
const confirmArchiveId = ref<number | null>(null)

function openPlaybook(_event: Event, row: TableRow<Playbook>) {
  navigateTo(`/playbooks/${row.original.id}`)
}

const columns = computed<Array<TableColumn<Playbook>>>(() => [
  {
    accessorKey: 'name',
    header: t('playbooks.list.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    accessorKey: 'isActive',
    header: t('playbooks.list.status'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.isActive ? t('playbooks.list.active') : t('playbooks.list.inactive'),
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'steps',
    header: t('playbooks.list.steps'),
    cell: ({ row }) => String(row.original.steps.length)
  },
  {
    accessorKey: 'updatedAt',
    header: t('playbooks.list.updated'),
    cell: ({ row }) => formatDateTime(row.original.updatedAt)
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { class: { th: 'w-24', td: 'w-24' } },
    cell: ({ row }) => h('div', {
      class: 'flex items-center justify-end gap-1',
      onClick: (event: Event) => event.stopPropagation()
    }, [
      h(UButton, {
        variant: 'ghost',
        color: 'neutral',
        icon: 'i-lucide-pencil',
        size: 'xs',
        onClick: () => navigateTo(`/playbooks/${row.original.id}`)
      }),
      h(UButton, {
        variant: 'ghost',
        color: 'error',
        icon: 'i-lucide-archive',
        size: 'xs',
        onClick: () => { confirmArchiveId.value = row.original.id }
      })
    ])
  }
])

async function onCreate() {
  const name = createName.value.trim()
  if (!name) return
  creating.value = true
  const created = await createPlaybook(name)
  creating.value = false
  if (created) {
    showCreate.value = false
    createName.value = ''
    await navigateTo(`/playbooks/${created.id}`)
  }
}

async function onArchive(id: number) {
  const ok = await archivePlaybook(id)
  if (ok) confirmArchiveId.value = null
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t(config.titleKey) }}
        </h1>
        <p class="mt-0.5 text-sm text-dimmed">
          {{ $t(config.subtitleKey) }}
        </p>
        <p
          v-if="config.quietDealNoteKey"
          class="mt-2 text-xs text-muted"
        >
          {{ $t(config.quietDealNoteKey) }}
        </p>
      </div>
      <UButton
        :label="$t('playbooks.list.create')"
        color="primary"
        icon="i-lucide-plus"
        @click="showCreate = true"
      />
    </div>

    <div class="mb-4">
      <UInput
        v-model="searchQuery"
        :placeholder="$t('playbooks.list.search')"
        icon="i-lucide-search"
        class="max-w-sm"
      />
    </div>

    <div
      v-if="pending"
      class="flex h-48 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="flex h-48 flex-col items-center justify-center gap-3"
    >
      <p class="text-sm text-dimmed">
        {{ $t('playbooks.list.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        variant="outline"
        color="neutral"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="playbooks.length === 0"
      class="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-default"
    >
      <p class="text-sm font-medium text-highlighted">
        {{ $t('playbooks.list.emptyTitle') }}
      </p>
      <p class="text-xs text-dimmed">
        {{ $t('playbooks.list.emptySubtitle') }}
      </p>
      <UButton
        :label="$t('playbooks.list.create')"
        color="primary"
        icon="i-lucide-plus"
        @click="showCreate = true"
      />
    </div>

    <div
      v-else
      style="max-height: calc(100vh - 260px)"
    >
      <UTable
        :data="playbooks"
        :columns="columns"
        :meta="{ class: { tr: 'cursor-pointer' } }"
        @select="openPlaybook"
      />
    </div>

    <div
      v-if="lastPage > 1"
      class="mt-4 flex items-center justify-end gap-2"
    >
      <UButton
        icon="i-lucide-chevron-left"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="!canGoPrev"
        @click="page--"
      />
      <span class="text-xs text-muted">{{ page }} / {{ lastPage }}</span>
      <UButton
        icon="i-lucide-chevron-right"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="!canGoNext"
        @click="page++"
      />
    </div>

    <UModal v-model:open="showCreate">
      <template #content>
        <div class="p-6">
          <h2 class="text-base font-semibold text-highlighted">
            {{ $t('playbooks.list.createTitle') }}
          </h2>
          <UFormField
            class="mt-4"
            :label="$t('playbooks.list.name')"
          >
            <UInput
              v-model="createName"
              class="w-full"
              @keyup.enter="onCreate"
            />
          </UFormField>
          <div class="mt-6 flex justify-end gap-2">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="outline"
              @click="showCreate = false"
            />
            <UButton
              :label="$t('playbooks.list.create')"
              color="primary"
              :loading="creating"
              @click="onCreate"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      :open="confirmArchiveId != null"
      @update:open="(v: boolean) => { if (!v) confirmArchiveId = null }"
    >
      <template #content>
        <div class="p-6">
          <h2 class="text-base font-semibold text-highlighted">
            {{ $t('playbooks.list.archiveConfirmTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('playbooks.list.archiveConfirmBody') }}
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="outline"
              @click="confirmArchiveId = null"
            />
            <UButton
              :label="$t('playbooks.list.archive')"
              color="error"
              @click="confirmArchiveId != null && onArchive(confirmArchiveId)"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
