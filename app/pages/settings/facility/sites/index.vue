<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiSite } from '~/types/facility'
import type { SiteListStatus } from '~/composables/useSitesList'
import { formatSiteLocation } from '~/composables/useSitesList'

const formSite = ref<ApiSite | null>(null)
const showForm = ref(false)

function openCreate() {
  formSite.value = null
  showForm.value = true
}

const {
  searchQuery,
  statusFilter,
  sites,
  totalSites,
  showingCount,
  perPage,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  archiveSite,
  unarchiveSite,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useSitesList()

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const NuxtLink = resolveComponent('NuxtLink')

const statusItems = computed(() => [
  { value: 'active' as SiteListStatus, label: t('pages.sites.statusActive') },
  { value: 'archived' as SiteListStatus, label: t('pages.sites.statusArchived') },
  { value: 'all' as SiteListStatus, label: t('pages.sites.statusAll') }
])

const columns = computed<Array<TableColumn<ApiSite>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h(NuxtLink, {
        to: `/settings/facility/sites/${row.original.id}`,
        class: 'font-medium text-highlighted hover:underline'
      }, () => row.original.name),
      row.original.code
        ? h('span', { class: 'text-xs text-dimmed' }, row.original.code)
        : null
    ])
  },
  {
    id: 'location',
    header: t('table.location'),
    cell: ({ row }) => formatSiteLocation(row.original)
  },
  {
    accessorKey: 'timezone',
    header: t('table.timezone'),
    cell: ({ row }) => row.original.timezone
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived ? t('pages.sites.statusArchived') : t('pages.sites.statusActive'),
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
          label: archived ? t('pages.sites.unarchive') : t('pages.sites.archive'),
          icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
          onSelect() {
            if (archived) {
              unarchiveSite(row.original)
              return
            }
            archiveSite(row.original)
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
          {{ $t('pages.settings.sitesTitle') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.settings.sitesSubtitle') }}
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
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.sites.search')"
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.sites.addSite')"
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
        {{ $t('pages.sites.loadError') }}
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
          :data="sites"
          :columns="columns"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalSites"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <FacilitySiteFormSlideover
      v-model:open="showForm"
      v-model:site="formSite"
      @saved="refresh()"
    />
  </UContainer>
</template>
