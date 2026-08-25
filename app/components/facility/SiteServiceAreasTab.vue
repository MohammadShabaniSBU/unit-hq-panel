<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiSiteServiceArea, SiteServiceAreaListStatus } from '~/types/facility'
import { Permission } from '~/types/permissions'

const props = defineProps<{
  siteId: number
}>()

const { t } = useI18n()
const { canAtSite } = usePermissions()

const siteIdRef = computed(() => props.siteId)
const canManage = computed(() => canAtSite(Permission.SiteManage, siteIdRef.value))

const showForm = ref(false)
const archiveTarget = ref<ApiSiteServiceArea | null>(null)
const showArchiveConfirm = ref(false)

const {
  statusFilter,
  areas,
  pending,
  error,
  refresh,
  archiveArea,
  unarchiveArea
} = useSiteServiceAreas(siteIdRef)

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusItems = computed(() => [
  { value: 'active' as SiteServiceAreaListStatus, label: t('facility.serviceAreas.statusActive') },
  { value: 'archived' as SiteServiceAreaListStatus, label: t('facility.serviceAreas.statusArchived') },
  { value: 'all' as SiteServiceAreaListStatus, label: t('facility.serviceAreas.statusAll') }
])

function requestArchive(item: ApiSiteServiceArea) {
  archiveTarget.value = item
  showArchiveConfirm.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) {
    return
  }

  const ok = await archiveArea(archiveTarget.value)
  if (ok) {
    showArchiveConfirm.value = false
    archiveTarget.value = null
  }
}

const columns = computed<Array<TableColumn<ApiSiteServiceArea>>>(() => [
  {
    accessorKey: 'kind',
    header: t('facility.serviceAreas.kind'),
    cell: ({ row }) => t(`facility.serviceAreas.kinds.${row.original.kind}`)
  },
  {
    accessorKey: 'value',
    header: t('facility.serviceAreas.value'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.value)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived
          ? t('facility.serviceAreas.statusArchived')
          : t('facility.serviceAreas.statusActive'),
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
      if (!canManage.value) {
        return null
      }

      const archived = row.original.archived_at != null
      const actions: Array<{ label: string, icon: string, onSelect: () => void }> = [
        {
          label: archived
            ? t('facility.serviceAreas.unarchive')
            : t('facility.serviceAreas.archive'),
          icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
          onSelect() {
            if (archived) {
              unarchiveArea(row.original)
              return
            }
            requestArchive(row.original)
          }
        }
      ]

      return h(UDropdownMenu, {
        items: [actions],
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
  <div>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <p class="text-sm text-dimmed">
        {{ $t('facility.serviceAreas.hint') }}
      </p>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          value-key="value"
          label-key="label"
          class="w-full sm:w-40"
        />
        <UButton
          v-if="canManage"
          icon="i-lucide-plus"
          :label="$t('facility.serviceAreas.add')"
          color="primary"
          class="shrink-0"
          @click="showForm = true"
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
        {{ $t('facility.serviceAreas.loadError') }}
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
      v-else
      class="mt-6 overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="areas"
        :columns="columns"
      />
    </div>

    <FacilitySiteServiceAreaFormSlideover
      v-model:open="showForm"
      :site-id="siteId"
      @saved="refresh()"
    />

    <UModal
      v-model:open="showArchiveConfirm"
      :title="$t('facility.serviceAreas.archiveConfirmTitle')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ $t('facility.serviceAreas.archiveConfirmBody', {
            value: archiveTarget?.value ?? ''
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
            :label="$t('facility.serviceAreas.archive')"
            color="error"
            @click="confirmArchive"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
