<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiLegalEntity } from '~/types/legalEntity'
import type { LegalEntityListStatus } from '~/composables/useLegalEntitiesList'

const formEntity = ref<ApiLegalEntity | null>(null)
const showForm = ref(false)
const archiveTarget = ref<ApiLegalEntity | null>(null)
const showArchiveConfirm = ref(false)

function openCreate() {
  formEntity.value = null
  showForm.value = true
}

function openEdit(entity: ApiLegalEntity) {
  formEntity.value = entity
  showForm.value = true
}

const {
  statusFilter,
  entities,
  totalEntities,
  showingCount,
  perPage,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  archiveEntity,
  unarchiveEntity,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useLegalEntitiesList()

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusItems = computed(() => [
  { value: 'active' as LegalEntityListStatus, label: t('pages.settings.legalEntities.statusActive') },
  { value: 'archived' as LegalEntityListStatus, label: t('pages.settings.legalEntities.statusArchived') },
  { value: 'all' as LegalEntityListStatus, label: t('pages.settings.legalEntities.statusAll') }
])

function requestArchive(entity: ApiLegalEntity) {
  archiveTarget.value = entity
  showArchiveConfirm.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) {
    return
  }

  const ok = await archiveEntity(archiveTarget.value)
  if (ok) {
    showArchiveConfirm.value = false
    archiveTarget.value = null
  }
}

const columns = computed<Array<TableColumn<ApiLegalEntity>>>(() => [
  {
    accessorKey: 'legal_name',
    header: t('forms.legalEntity.legalName'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.legal_name),
      row.original.trading_name
        ? h('span', { class: 'text-xs text-dimmed' }, row.original.trading_name)
        : null
    ])
  },
  {
    accessorKey: 'tax_id',
    header: t('forms.legalEntity.taxId'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', {}, row.original.tax_id),
      h('span', { class: 'text-xs text-dimmed' }, row.original.tax_id_type.toUpperCase())
    ])
  },
  {
    id: 'sites_count',
    header: t('pages.settings.legalEntities.sitesCount'),
    cell: ({ row }) => String(row.original.sites_count ?? 0)
  },
  {
    id: 'fiscal_regime',
    header: t('forms.legalEntity.fiscalRegime'),
    cell: ({ row }) => t(`forms.legalEntity.fiscalRegimes.${row.original.fiscal_regime}`)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived
          ? t('pages.settings.legalEntities.statusArchived')
          : t('pages.settings.legalEntities.statusActive'),
        color: archived ? 'neutral' : 'success',
        variant: 'subtle',
        size: 'sm'
      })
    }
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UDropdownMenu, {
        items: [[{
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            openEdit(row.original)
          }
        }, {
          label: archived
            ? t('pages.settings.legalEntities.unarchive')
            : t('pages.settings.legalEntities.archive'),
          icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
          onSelect() {
            if (archived) {
              unarchiveEntity(row.original)
              return
            }
            requestArchive(row.original)
          }
        }]],
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          'icon': 'i-lucide-ellipsis',
          'color': 'neutral',
          'variant': 'ghost',
          'size': 'sm',
          'square': true,
          'aria-label': t('common.actions')
        })
      })
    }
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.settings.legalEntities.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.settings.legalEntities.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          value-key="value"
          label-key="label"
          class="w-full sm:w-40"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.settings.legalEntities.add')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
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
        {{ $t('pages.settings.legalEntities.loadError') }}
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
        class="mt-6 overflow-hidden rounded-lg border border-default"
        style="height: calc(100vh - 280px)"
      >
        <UTable
          :data="entities"
          :columns="columns"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalEntities"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <SettingsLegalEntityFormSlideover
      v-model:open="showForm"
      v-model:entity="formEntity"
      @saved="refresh()"
    />

    <UModal
      v-model:open="showArchiveConfirm"
      :title="$t('pages.settings.legalEntities.archiveConfirmTitle')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ $t('pages.settings.legalEntities.archiveConfirmBody', {
            name: archiveTarget?.legal_name ?? ''
          }) }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="showArchiveConfirm = false"
          />
          <UButton
            :label="$t('pages.settings.legalEntities.archive')"
            color="error"
            @click="confirmArchive"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
