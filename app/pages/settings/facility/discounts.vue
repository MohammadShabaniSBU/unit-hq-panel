<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiDiscount, DiscountListStatus } from '~/types/facility'
import {
  formatDiscountKind,
  formatDiscountSummary,
  useDiscountsList
} from '~/composables/useDiscountsList'

const {
  searchQuery,
  statusFilter,
  discounts,
  pending,
  error,
  refresh,
  archiveDiscount,
  unarchiveDiscount
} = useDiscountsList()

const { t } = useI18n()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const formDiscount = ref<ApiDiscount | null>(null)
const showForm = ref(false)
const archiveTarget = ref<ApiDiscount | null>(null)
const showArchiveConfirm = ref(false)

const statusItems = computed(() => [
  { value: 'active' as DiscountListStatus, label: t('settings.discounts.statusActive') },
  { value: 'archived' as DiscountListStatus, label: t('settings.discounts.statusArchived') },
  { value: 'all' as DiscountListStatus, label: t('settings.discounts.statusAll') }
])

function openCreate() {
  formDiscount.value = null
  showForm.value = true
}

function openEdit(discount: ApiDiscount) {
  formDiscount.value = discount
  showForm.value = true
}

function requestArchive(discount: ApiDiscount) {
  archiveTarget.value = discount
  showArchiveConfirm.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) {
    return
  }

  const ok = await archiveDiscount(archiveTarget.value)
  if (ok) {
    showArchiveConfirm.value = false
    archiveTarget.value = null
  }
}

const columns = computed<Array<TableColumn<ApiDiscount>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-1' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.name),
      h('div', { class: 'flex flex-wrap gap-1' }, [
        row.original.alignment_warnings.length
          ? h(UBadge, {
              label: t('settings.discounts.alignmentBadge'),
              color: 'warning',
              variant: 'subtle',
              size: 'sm',
              class: 'w-fit'
            })
          : null,
        row.original.agent_offerable
          ? h(UBadge, {
              label: t('settings.discounts.agentOfferableBadge'),
              color: 'info',
              variant: 'subtle',
              size: 'sm',
              class: 'w-fit'
            })
          : null
      ])
    ])
  },
  {
    id: 'kind',
    header: t('table.type'),
    cell: ({ row }) => h(UBadge, {
      label: formatDiscountKind(row.original.kind, t),
      color: row.original.kind === 'percent' ? 'primary' : 'info',
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'summary',
    header: t('settings.discounts.summary'),
    cell: ({ row }) => formatDiscountSummary(row.original, t)
  },
  {
    id: 'usage_count',
    header: t('settings.discounts.usage'),
    cell: ({ row }) => t('settings.discounts.usageCount', {
      count: row.original.usage_count
    })
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived
          ? t('settings.discounts.statusArchived')
          : t('settings.discounts.statusActive'),
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
            ? t('settings.discounts.unarchive')
            : t('settings.discounts.archive'),
          icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
          onSelect() {
            if (archived) {
              unarchiveDiscount(row.original)
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
      :title="$t('settings.discounts.title')"
      :subtitle="$t('settings.discounts.subtitle')"
    />

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('settings.discounts.search')"
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
        :label="$t('settings.discounts.add')"
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
        :data="discounts"
        :columns="columns"
        :loading="pending"
        class="w-full"
      />
    </div>

    <SettingsDiscountFormSlideover
      v-model:open="showForm"
      v-model:discount="formDiscount"
      @saved="refresh"
    />

    <UModal v-model:open="showArchiveConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-highlighted font-medium">
            {{ $t('settings.discounts.archiveConfirmTitle') }}
          </h3>
          <p class="text-sm text-dimmed">
            {{ $t('settings.discounts.archiveConfirmBody', {
              name: archiveTarget?.name ?? ''
            }) }}
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
              {{ $t('settings.discounts.archive') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
