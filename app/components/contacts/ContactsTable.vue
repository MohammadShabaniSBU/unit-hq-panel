<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiContact } from '~/types/contact'
import { useContactFormatters } from '~/composables/useContactsList'

const props = withDefaults(defineProps<{
  contacts: Array<ApiContact>
  selectedIds: Array<string>
  isAllPageSelected: boolean
  isSomePageSelected: boolean
  pending?: boolean
}>(), {
  pending: false
})

const emit = defineEmits<{
  toggleSelected: [id: string]
  toggleAllSelected: []
}>()

const { t } = useI18n()
const { formatContactName, formatContactInitials, formatRelativeActivity } = useContactFormatters()

const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')
const ContactStatusBadge = resolveComponent('ContactsContactStatusBadge')

function onRowSelect(_event: Event, row: TableRow<ApiContact>) {
  if (props.pending) {
    return
  }

  navigateTo(`/leasing/contacts/${row.original.id}`)
}

const columns = computed<Array<TableColumn<ApiContact>>>(() => [
  {
    id: 'select',
    header: () => h(UCheckbox, {
      'modelValue': props.isSomePageSelected ? 'indeterminate' : props.isAllPageSelected,
      'disabled': props.pending,
      'onUpdate:modelValue': () => emit('toggleAllSelected'),
      'aria-label': t('common.selectAll')
    }),
    cell: ({ row }) => h('div', {
      onClick: (event: Event) => event.stopPropagation()
    }, [
      h(UCheckbox, {
        'modelValue': props.selectedIds.includes(String(row.original.id)),
        'disabled': props.pending,
        'onUpdate:modelValue': () => emit('toggleSelected', String(row.original.id)),
        'aria-label': t('common.selectItem', { name: formatContactName(row.original) })
      })
    ]),
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10'
      }
    }
  },
  {
    accessorKey: 'first_name',
    header: t('table.name'),
    cell: ({ row }) => {
      const contact = row.original
      const name = formatContactName(contact)
      return h('div', { class: 'flex items-center gap-3 min-w-[200px]' }, [
        h(UAvatar, {
          text: formatContactInitials(contact),
          size: 'sm',
          class: 'bg-elevated text-highlighted shrink-0'
        }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'truncate font-medium text-highlighted' }, name),
          h('p', { class: 'truncate text-sm text-dimmed' }, contact.email ?? '—')
        ])
      ])
    }
  },
  {
    accessorKey: 'company',
    header: t('table.company'),
    cell: ({ row }) => row.original.company ?? '—'
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(ContactStatusBadge, { status: row.original.status })
  },
  {
    id: 'lastContacted',
    header: t('table.lastContacted'),
    cell: ({ row }) => {
      const { last_contacted_at } = row.original
      if (!last_contacted_at) {
        return '—'
      }

      return h('span', { class: 'text-sm text-highlighted' }, formatRelativeActivity(last_contacted_at))
    }
  }
])
</script>

<template>
  <div
    :class="pending ? '[&_tbody_tr]:pointer-events-none [&_tbody_tr]:cursor-wait' : ''"
    style="height: calc(100vh - 320px)"
  >
    <UTable
      :data="contacts"
      :columns="columns"
      :loading="pending"
      :meta="{ class: { tr: 'cursor-pointer' } }"
      @select="onRowSelect"
    />
  </div>
</template>
