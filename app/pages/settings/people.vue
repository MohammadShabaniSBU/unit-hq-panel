<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { ApiEmployeeGrant, ApiEmployeeRow } from '~/types/rbac'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.RbacManage)) {
  await navigateTo('/settings/general')
}

const { t } = useI18n()
const { post, del } = useApi()
const toast = useToast()
const {
  searchQuery,
  employees,
  pending,
  error,
  refresh
} = useEmployeeList()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const selected = ref<ApiEmployeeRow | null>(null)
const grantDrawerOpen = ref(false)
const createOpen = ref(false)
const editNameOpen = ref(false)
const editNameEmployee = ref<ApiEmployeeRow | null>(null)
const rowErrors = ref<Record<number, string>>({})
const actionBusyId = ref<number | null>(null)

function openGrants(employee: ApiEmployeeRow) {
  selected.value = employee
  grantDrawerOpen.value = true
}

function openEditName(employee: ApiEmployeeRow) {
  editNameEmployee.value = employee
  editNameOpen.value = true
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

function statusLabel(status: ApiEmployeeRow['status']) {
  return t(`pages.settings.people.status.${status}`)
}

function formatLastSignIn(employee: ApiEmployeeRow) {
  if (!employee.last_login_at) {
    return null
  }
  return new Date(employee.last_login_at).toLocaleString()
}

async function resendInvite(employee: ApiEmployeeRow) {
  actionBusyId.value = employee.id
  const { [employee.id]: _, ...rest } = rowErrors.value
  rowErrors.value = rest
  try {
    const res = await post<{ invite_link: string, email_sent: boolean }>(
      `/api/employees/${employee.id}/invitations`,
      {}
    )
    await navigator.clipboard.writeText(res.data.invite_link).catch(() => undefined)
    toast.add({
      title: t('pages.settings.people.resendSuccess'),
      description: res.data.invite_link,
      color: 'success'
    })
    await refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    rowErrors.value = {
      ...rowErrors.value,
      [employee.id]: fetchError.data?.message ?? t('pages.settings.people.resendError')
    }
  } finally {
    actionBusyId.value = null
  }
}

async function revokeInvite(employee: ApiEmployeeRow) {
  if (!employee.open_invitation_id) {
    return
  }
  actionBusyId.value = employee.id
  const { [employee.id]: _, ...rest } = rowErrors.value
  rowErrors.value = rest
  try {
    await del(`/api/employees/${employee.id}/invitations/${employee.open_invitation_id}`)
    toast.add({ title: t('pages.settings.people.revokeSuccess'), color: 'success' })
    await refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    rowErrors.value = {
      ...rowErrors.value,
      [employee.id]: fetchError.data?.message ?? t('pages.settings.people.revokeError')
    }
  } finally {
    actionBusyId.value = null
  }
}

async function deactivate(employee: ApiEmployeeRow) {
  const confirmed = window.confirm(t('pages.settings.people.deactivateConfirm'))
  if (!confirmed) {
    return
  }
  actionBusyId.value = employee.id
  const { [employee.id]: _, ...rest } = rowErrors.value
  rowErrors.value = rest
  try {
    await post(`/api/employees/${employee.id}/deactivate`, {})
    toast.add({ title: t('pages.settings.people.deactivateSuccess'), color: 'success' })
    await refresh()
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { errors?: Record<string, Array<string>>, message?: string }
    }
    rowErrors.value = {
      ...rowErrors.value,
      [employee.id]: fetchError.data?.errors?.employee?.[0]
        ?? fetchError.data?.message
        ?? t('pages.settings.people.lastOwnerError')
    }
  } finally {
    actionBusyId.value = null
  }
}

async function reactivate(employee: ApiEmployeeRow) {
  actionBusyId.value = employee.id
  const { [employee.id]: _, ...rest } = rowErrors.value
  rowErrors.value = rest
  try {
    await post(`/api/employees/${employee.id}/reactivate`, {})
    toast.add({ title: t('pages.settings.people.reactivateSuccess'), color: 'success' })
    await refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    rowErrors.value = {
      ...rowErrors.value,
      [employee.id]: fetchError.data?.message ?? t('pages.settings.people.reactivateError')
    }
  } finally {
    actionBusyId.value = null
  }
}

function rowMenuItems(employee: ApiEmployeeRow): Array<Array<DropdownMenuItem>> {
  const items: Array<DropdownMenuItem> = [
    {
      label: t('pages.settings.people.editName'),
      icon: 'i-lucide-pencil',
      onSelect() {
        openEditName(employee)
      }
    },
    {
      label: t('pages.settings.people.manageAccess'),
      icon: 'i-lucide-shield',
      onSelect() {
        openGrants(employee)
      }
    }
  ]

  if (employee.status !== 'deactivated') {
    if (employee.status === 'invited' || employee.open_invitation_id) {
      items.push({
        label: t('pages.settings.people.resendInvite'),
        icon: 'i-lucide-mail',
        onSelect() {
          void resendInvite(employee)
        }
      })
    }
    if (employee.open_invitation_id) {
      items.push({
        label: t('pages.settings.people.revokeInvite'),
        icon: 'i-lucide-ban',
        onSelect() {
          void revokeInvite(employee)
        }
      })
    }
    items.push({
      label: t('pages.settings.people.deactivate'),
      icon: 'i-lucide-user-x',
      color: 'error',
      onSelect() {
        void deactivate(employee)
      }
    })
  } else {
    items.push({
      label: t('pages.settings.people.reactivate'),
      icon: 'i-lucide-user-check',
      onSelect() {
        void reactivate(employee)
      }
    })
  }

  return [items]
}

const columns = computed<Array<TableColumn<ApiEmployeeRow>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => {
      const dimmed = row.original.status === 'deactivated'
      return h('div', { class: ['flex flex-col gap-0.5', dimmed ? 'opacity-50' : ''] }, [
        h('span', { class: 'font-medium text-highlighted' }, row.original.name),
        h('span', { class: 'text-xs text-dimmed' }, row.original.email),
        rowErrors.value[row.original.id]
          ? h('span', { class: 'text-xs text-error' }, rowErrors.value[row.original.id])
          : null
      ])
    }
  },
  {
    id: 'grants',
    header: t('pages.settings.people.grants'),
    cell: ({ row }) => {
      if (row.original.grants.length === 0) {
        return h('span', {
          class: [
            'text-sm text-dimmed',
            row.original.status === 'deactivated' ? 'opacity-50' : ''
          ]
        }, t('pages.settings.people.noGrants'))
      }
      return h('div', {
        class: [
          'flex flex-wrap gap-1',
          row.original.status === 'deactivated' ? 'opacity-50' : ''
        ]
      },
      row.original.grants.map(grant => h(UBadge, {
        label: roleChipLabel(grant),
        color: grant.is_company_wide ? 'primary' : 'neutral',
        variant: 'subtle',
        size: 'sm'
      }))
      )
    }
  },
  {
    id: 'status',
    header: t('pages.settings.people.statusLabel'),
    cell: ({ row }) => h(UBadge, {
      label: statusLabel(row.original.status),
      color: row.original.status === 'active'
        ? 'success'
        : row.original.status === 'invited' ? 'warning' : 'neutral',
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'last_login',
    header: t('pages.settings.people.lastSignIn'),
    cell: ({ row }) => {
      const formatted = formatLastSignIn(row.original)
      if (formatted) {
        return h('span', {
          class: [
            'text-sm text-muted',
            row.original.status === 'deactivated' ? 'opacity-50' : ''
          ]
        }, formatted)
      }
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: 'text-sm text-dimmed' }, t('pages.settings.people.neverSignedIn')),
        row.original.status === 'invited'
          ? h(UButton, {
              label: t('pages.settings.people.resendInvite'),
              color: 'neutral',
              variant: 'link',
              size: 'xs',
              class: 'px-0',
              loading: actionBusyId.value === row.original.id,
              onClick: (e: Event) => {
                e.stopPropagation()
                void resendInvite(row.original)
              }
            })
          : null
      ])
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UDropdownMenu, {
      items: rowMenuItems(row.original),
      content: { align: 'end' }
    }, {
      default: () => h(UButton, {
        'icon': 'i-lucide-ellipsis',
        'color': 'neutral',
        'variant': 'ghost',
        'size': 'sm',
        'square': true,
        'aria-label': t('common.actions'),
        'onClick': (e: Event) => e.stopPropagation()
      })
    })
  }
])
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="$t('pages.settings.people.title')"
      :subtitle="$t('pages.settings.people.subtitle')"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-lucide-user-plus"
          :label="$t('pages.settings.people.addPerson')"
          @click="createOpen = true"
        />
      </template>
    </SettingsSectionHeader>

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
      />
    </div>

    <SettingsEmployeeGrantSlideover
      v-model:open="grantDrawerOpen"
      :employee="selected"
      @changed="refresh()"
    />
    <SettingsEmployeeCreateSlideover
      v-model:open="createOpen"
      @created="refresh()"
    />
    <SettingsEmployeeEditNameModal
      v-model:open="editNameOpen"
      :employee="editNameEmployee"
      @saved="refresh()"
    />
  </div>
</template>
