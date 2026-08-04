<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiRole, RoleStatusFilter } from '~/types/rbac'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.RbacManage)) {
  await navigateTo('/settings/general')
}

const { t } = useI18n()
const toast = useToast()
const { post } = useApi()
const {
  statusFilter,
  searchQuery,
  roles,
  pending,
  error,
  refresh
} = useRoleList()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusItems = computed(() => [
  {
    label: t('pages.settings.roles.statusActive'),
    value: 'active' as RoleStatusFilter
  },
  {
    label: t('pages.settings.roles.statusArchived'),
    value: 'archived' as RoleStatusFilter
  },
  {
    label: t('pages.settings.roles.statusAll'),
    value: 'all' as RoleStatusFilter
  }
])

function scopeLabel(scope: ApiRole['scope_level']) {
  return t(`pages.settings.roles.scope.${scope}`)
}

function roleLabel(role: ApiRole) {
  if (role.is_system) {
    const key = `roles.${role.key}`
    const translated = t(key)
    return translated !== key ? translated : role.label
  }
  return role.label
}

async function handleArchive(role: ApiRole) {
  try {
    await post(`/api/roles/${role.id}/archive`, {})
    toast.add({
      title: t('pages.settings.roles.archiveSuccess'),
      color: 'success'
    })
    refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    toast.add({
      title: fetchError.data?.errors?.role?.[0]
        ?? fetchError.data?.message
        ?? t('pages.settings.roles.archiveError'),
      color: 'error'
    })
  }
}

async function handleUnarchive(role: ApiRole) {
  try {
    await post(`/api/roles/${role.id}/unarchive`, {})
    toast.add({
      title: t('pages.settings.roles.unarchiveSuccess'),
      color: 'success'
    })
    refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.roles.unarchiveError'),
      color: 'error'
    })
  }
}

const columns = computed<Array<TableColumn<ApiRole>>>(() => [
  {
    accessorKey: 'label',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'font-medium text-highlighted' }, roleLabel(row.original)),
        ...(row.original.is_system
          ? [h(UBadge, {
              label: t('pages.settings.roles.systemBadge'),
              color: 'primary',
              variant: 'subtle',
              size: 'sm'
            })]
          : []),
        ...(row.original.archived_at
          ? [h(UBadge, {
              label: t('pages.settings.roles.archivedBadge'),
              color: 'neutral',
              variant: 'subtle',
              size: 'sm'
            })]
          : [])
      ]),
      h('span', { class: 'text-xs text-dimmed' }, row.original.key)
    ])
  },
  {
    id: 'scope_level',
    header: t('pages.settings.roles.scopeLevel'),
    cell: ({ row }) => scopeLabel(row.original.scope_level)
  },
  {
    id: 'permission_count',
    header: t('pages.settings.roles.permissions'),
    cell: ({ row }) => String(row.original.permission_count)
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: ({ row }) => {
      const role = row.original
      const items = [[
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            void navigateTo(`/settings/roles/${role.id}`)
          }
        },
        ...(role.is_system
          ? []
          : [
              role.archived_at
                ? {
                    label: t('common.unarchive'),
                    icon: 'i-lucide-archive-restore',
                    onSelect() {
                      void handleUnarchive(role)
                    }
                  }
                : {
                    label: t('common.archive'),
                    icon: 'i-lucide-archive',
                    onSelect() {
                      void handleArchive(role)
                    }
                  }
            ])
      ]]

      return h(UDropdownMenu, {
        items,
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
    <SettingsSectionHeader
      :title="$t('pages.settings.roles.title')"
      :subtitle="$t('pages.settings.roles.subtitle')"
    />

    <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.settings.roles.search')"
          class="w-full sm:w-64"
        />
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          value-key="value"
          class="w-full sm:w-40"
        />
      </div>

      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.settings.roles.create')"
        color="primary"
        class="shrink-0"
        @click="navigateTo('/settings/roles/new')"
      />
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

    <SettingsLoadError
      v-else-if="error"
      :message="$t('pages.settings.roles.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="mt-6 overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="roles"
        :columns="columns"
      />
    </div>
  </div>
</template>
