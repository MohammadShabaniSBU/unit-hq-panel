<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiDelinquencyPolicy, DelinquencyPolicyListStatus } from '~/types/delinquency'

const {
  statusFilter,
  policies,
  fiscal,
  pending,
  error,
  refresh,
  archivePolicy,
  unarchivePolicy
} = useDelinquencyPolicies()

const { t } = useI18n()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const formPolicy = ref<ApiDelinquencyPolicy | null>(null)
const showForm = ref(false)
const archiveTarget = ref<ApiDelinquencyPolicy | null>(null)
const showArchiveConfirm = ref(false)

const statusItems = computed(() => [
  { value: 'active' as DelinquencyPolicyListStatus, label: t('pages.settings.delinquency.statusActive') },
  { value: 'archived' as DelinquencyPolicyListStatus, label: t('pages.settings.delinquency.statusArchived') },
  { value: 'all' as DelinquencyPolicyListStatus, label: t('pages.settings.delinquency.statusAll') }
])

function openCreate() {
  formPolicy.value = null
  showForm.value = true
}

function openEdit(policy: ApiDelinquencyPolicy) {
  formPolicy.value = policy
  showForm.value = true
}

function requestArchive(policy: ApiDelinquencyPolicy) {
  archiveTarget.value = policy
  showArchiveConfirm.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) {
    return
  }

  const ok = await archivePolicy(archiveTarget.value)
  if (ok) {
    showArchiveConfirm.value = false
    archiveTarget.value = null
  }
}

const columns = computed<Array<TableColumn<ApiDelinquencyPolicy>>>(() => [
  {
    accessorKey: 'name',
    header: t('pages.settings.delinquency.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    id: 'steps',
    header: t('pages.settings.delinquency.steps'),
    cell: ({ row }) => String(row.original.steps?.length ?? 0)
  },
  {
    id: 'sites_count',
    header: t('pages.settings.delinquency.sitesCount'),
    cell: ({ row }) => t('pages.settings.delinquency.usedBySites', {
      count: row.original.sites_count ?? 0
    })
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived
          ? t('pages.settings.delinquency.statusArchived')
          : t('pages.settings.delinquency.statusActive'),
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
            ? t('pages.settings.delinquency.unarchive')
            : t('pages.settings.delinquency.archive'),
          icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
          onSelect() {
            if (archived) {
              unarchivePolicy(row.original)
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
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <UPageHeader :title="$t('pages.settings.lateFeesLiens')" />
        <p class="text-sm text-dimmed max-w-2xl">
          {{ $t('pages.settings.delinquency.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        {{ $t('pages.settings.delinquency.addPolicy') }}
      </UButton>
    </div>

    <UAlert
      color="neutral"
      variant="subtle"
      :title="$t('pages.settings.delinquency.livePolicyHelp')"
      :description="$t('pages.settings.delinquency.livePolicyHelpDetail')"
    />

    <div
      v-if="fiscal"
      class="rounded-lg border border-default p-4 space-y-2"
    >
      <h3 class="text-sm font-medium text-highlighted">
        {{ $t('pages.settings.delinquency.fiscalTitle') }}
      </h3>
      <p class="text-sm text-dimmed">
        {{ $t('pages.settings.delinquency.fiscalLateFeeTax', { rate: fiscal.late_fee_tax }) }}
      </p>
      <p class="text-sm text-dimmed">
        {{ fiscal.invoice_late_fees
          ? $t('pages.settings.delinquency.fiscalInvoiceLateFeesOn')
          : $t('pages.settings.delinquency.fiscalInvoiceLateFeesOff') }}
      </p>
      <p class="text-xs text-dimmed">
        {{ $t('pages.settings.delinquency.fiscalGestorNote') }}
      </p>
    </div>

    <div class="flex items-center gap-3">
      <USelect
        v-model="statusFilter"
        :items="statusItems"
        value-key="value"
        label-key="label"
        class="w-48"
      />
    </div>

    <SettingsLoadError
      v-if="error"
      :message="error"
      @retry="refresh"
    />

    <UTable
      v-else
      :data="policies"
      :columns="columns"
      :loading="pending"
      class="w-full"
    />

    <SettingsDelinquencyPolicyFormSlideover
      v-model:open="showForm"
      v-model:policy="formPolicy"
      @saved="refresh"
    />

    <UModal v-model:open="showArchiveConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-highlighted font-medium">
            {{ $t('pages.settings.delinquency.archiveConfirmTitle') }}
          </h3>
          <p class="text-sm text-dimmed">
            {{ $t('pages.settings.delinquency.archiveConfirmBody', {
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
              {{ $t('pages.settings.delinquency.archive') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
