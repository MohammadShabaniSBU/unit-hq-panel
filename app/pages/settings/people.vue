<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiEmployeeGrant, ApiEmployeeRow } from '~/types/rbac'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.RbacManage)) {
  await navigateTo('/settings/general')
}

const { t } = useI18n()
const {
  searchQuery,
  employees,
  pending,
  error,
  refresh
} = useEmployeeList()

const UBadge = resolveComponent('UBadge')

const selected = ref<ApiEmployeeRow | null>(null)
const drawerOpen = ref(false)

function openGrants(employee: ApiEmployeeRow) {
  selected.value = employee
  drawerOpen.value = true
}

function roleChipLabel(grant: ApiEmployeeGrant) {
  const key = `roles.${grant.role_key}`
  const translated = t(key)
  const label = translated !== key ? translated : grant.role_label
  if (grant.is_company_wide) {
    return label
  }
  return `${label} · ${grant.site_name ?? ''}`
}

const columns = computed<Array<TableColumn<ApiEmployeeRow>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.name),
      h('span', { class: 'text-xs text-dimmed' }, row.original.email)
    ])
  },
  {
    id: 'grants',
    header: t('pages.settings.people.grants'),
    cell: ({ row }) => {
      if (row.original.grants.length === 0) {
        return h('span', { class: 'text-sm text-dimmed' }, t('pages.settings.people.noGrants'))
      }
      return h('div', { class: 'flex flex-wrap gap-1' },
        row.original.grants.map(grant => h(UBadge, {
          label: roleChipLabel(grant),
          color: grant.is_company_wide ? 'primary' : 'neutral',
          variant: 'subtle',
          size: 'sm'
        }))
      )
    }
  }
])
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="$t('pages.settings.people.title')"
      :subtitle="$t('pages.settings.people.subtitle')"
    />

    <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('pages.settings.people.search')"
        class="w-full sm:w-72"
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
      :message="$t('pages.settings.people.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="mt-6 overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="employees"
        :columns="columns"
        :ui="{
          tr: 'cursor-pointer'
        }"
        @select="(_e, row) => openGrants(row.original)"
      />
    </div>

    <SettingsEmployeeGrantSlideover
      v-model:open="drawerOpen"
      :employee="selected"
      @changed="refresh()"
    />
  </div>
</template>
