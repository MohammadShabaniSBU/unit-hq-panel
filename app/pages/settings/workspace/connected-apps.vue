<script setup lang="ts">
import { Permission } from '~/types/permissions'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { ConnectedAppRow } from '~/composables/useConnectedApps'

const { can } = usePermissions()
if (!can(Permission.CredentialManage)) {
  await navigateTo('/settings/workspace/general')
}

const { t } = useI18n()
const { rows, pending, statusLabel } = useConnectedApps()

const UIcon = resolveComponent('UIcon')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

function statusColor(status: string | null) {
  if (status === 'connected') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  if (status === 'pending') {
    return 'warning' as const
  }
  return 'neutral' as const
}

const columns = computed<Array<TableColumn<ConnectedAppRow>>>(() => [
  {
    accessorKey: 'displayName',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2.5' }, [
      h(UIcon, { name: row.original.icon, class: 'size-4 shrink-0' }),
      h('span', { class: 'font-medium text-highlighted' }, row.original.displayName)
    ])
  },
  {
    accessorKey: 'capability',
    header: t('settings.connectedApps.capability'),
    cell: ({ row }) => t(`settings.connectedApps.capabilities.${row.original.capability}`)
  },
  {
    accessorKey: 'scopeLabel',
    header: t('settings.connectedApps.scope')
  },
  {
    accessorKey: 'status',
    header: t('settings.connectedApps.status'),
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.status),
      variant: 'subtle',
      label: statusLabel(row.original.status)
    })
  },
  {
    id: 'configure',
    header: '',
    enableSorting: false,
    cell: ({ row }) => h(UButton, {
      to: row.original.configureTo,
      label: t('settings.connectedApps.configure'),
      color: 'neutral',
      variant: 'outline',
      size: 'sm'
    })
  }
])
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.connectedApps')"
      :subtitle="t('settings.connectedApps.subtitle')"
    />

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <p
      v-else-if="!rows.length"
      class="mt-6 text-sm text-dimmed"
    >
      {{ t('settings.connectedApps.empty') }}
    </p>

    <div
      v-else
      class="mt-6"
    >
      <UTable
        :data="rows"
        :columns="columns"
      />
    </div>
  </div>
</template>
