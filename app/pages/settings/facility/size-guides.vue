<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiSizeGuide, SizeGuideListStatus } from '~/types/facility'
import {
  formatSizeGuideBand,
  formatSizeGuideMetric,
  useSizeGuidesList
} from '~/composables/useSizeGuidesList'

const {
  searchQuery,
  statusFilter,
  guides,
  pending,
  error,
  refresh,
  archiveGuide,
  unarchiveGuide
} = useSizeGuidesList()

const { t } = useI18n()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const formGuide = ref<ApiSizeGuide | null>(null)
const showForm = ref(false)
const archiveTarget = ref<ApiSizeGuide | null>(null)
const showArchiveConfirm = ref(false)

const statusItems = computed(() => [
  { value: 'active' as SizeGuideListStatus, label: t('facility.size_guides.statusActive') },
  { value: 'archived' as SizeGuideListStatus, label: t('facility.size_guides.statusArchived') },
  { value: 'all' as SizeGuideListStatus, label: t('facility.size_guides.statusAll') }
])

function openCreate() {
  formGuide.value = null
  showForm.value = true
}

function openEdit(guide: ApiSizeGuide) {
  formGuide.value = guide
  showForm.value = true
}

function requestArchive(guide: ApiSizeGuide) {
  archiveTarget.value = guide
  showArchiveConfirm.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) {
    return
  }

  const ok = await archiveGuide(archiveTarget.value)
  if (ok) {
    showArchiveConfirm.value = false
    archiveTarget.value = null
  }
}

function quantityLabel(guide: ApiSizeGuide) {
  if (guide.min_quantity != null && guide.max_quantity != null) {
    return `${guide.min_quantity}–${guide.max_quantity}`
  }
  if (guide.min_quantity != null) {
    return `${guide.min_quantity}+`
  }
  if (guide.max_quantity != null) {
    return `≤ ${guide.max_quantity}`
  }

  return '—'
}

const columns = computed<Array<TableColumn<ApiSizeGuide>>>(() => [
  {
    accessorKey: 'metric',
    header: t('facility.size_guides.metric'),
    cell: ({ row }) => formatSizeGuideMetric(row.original.metric, t)
  },
  {
    id: 'scope',
    header: t('facility.size_guides.scope'),
    cell: ({ row }) => row.original.site_name ?? t('facility.size_guides.companyDefault')
  },
  {
    id: 'quantity',
    header: t('facility.size_guides.quantity'),
    cell: ({ row }) => quantityLabel(row.original)
  },
  {
    id: 'band',
    header: t('facility.size_guides.band'),
    cell: ({ row }) => formatSizeGuideBand(row.original)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived
          ? t('facility.size_guides.statusArchived')
          : t('facility.size_guides.statusActive'),
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
            ? t('facility.size_guides.unarchive')
            : t('facility.size_guides.archive'),
          icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
          onSelect() {
            if (archived) {
              unarchiveGuide(row.original)
              return
            }
            requestArchive(row.original)
          }
        }]]
      }, () => h(UButton, {
        icon: 'i-lucide-ellipsis-vertical',
        color: 'neutral',
        variant: 'ghost',
        size: 'xs',
        square: true
      }))
    }
  }
])

onMounted(() => {
  refresh()
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <SettingsSectionHeader
      :title="$t('facility.size_guides.title')"
      :subtitle="$t('facility.size_guides.subtitle')"
    />

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('facility.size_guides.search')"
          class="w-full sm:w-72"
        />
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          value-key="value"
          label-key="label"
          class="w-48"
        />
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('facility.size_guides.add')"
        class="shrink-0"
        @click="openCreate"
      />
    </div>

    <SettingsLoadError
      v-if="error"
      :message="error"
      @retry="refresh"
    />

    <div
      v-else
      class="overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="guides"
        :columns="columns"
        :loading="pending"
        class="w-full"
      />
    </div>

    <SettingsSizeGuideFormSlideover
      v-model:open="showForm"
      v-model:guide="formGuide"
      @saved="refresh"
    />

    <UModal v-model:open="showArchiveConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-highlighted font-medium">
            {{ $t('facility.size_guides.archiveConfirmTitle') }}
          </h3>
          <p class="text-sm text-dimmed">
            {{ $t('facility.size_guides.archiveConfirmBody') }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showArchiveConfirm = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              color="error"
              @click="confirmArchive"
            >
              {{ $t('facility.size_guides.archive') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
