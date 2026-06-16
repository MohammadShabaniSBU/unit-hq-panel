<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Contact } from '~/types/contact'
import {
  activityChannelIcons,
  activityChannelLabels,
  formatContactBalance,
  formatContactInitials,
  formatContactType,
  formatRelativeActivity
} from '~/composables/useContactsList'

const props = defineProps<{
  contacts: Contact[]
  selectedIds: string[]
  isAllPageSelected: boolean
  isSomePageSelected: boolean
}>()

const emit = defineEmits<{
  toggleSelected: [id: string]
  toggleAllSelected: []
}>()

const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')
const ContactStatusBadge = resolveComponent('ContactsContactStatusBadge')

const columns: TableColumn<Contact>[] = [
  {
    id: 'select',
    header: () => h(UCheckbox, {
      'modelValue': props.isSomePageSelected ? 'indeterminate' : props.isAllPageSelected,
      'onUpdate:modelValue': () => emit('toggleAllSelected'),
      'aria-label': 'Select all'
    }),
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': props.selectedIds.includes(row.original.id),
      'onUpdate:modelValue': () => emit('toggleSelected', row.original.id),
      'aria-label': `Select ${row.original.name}`
    }),
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
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const contact = row.original
      return h('div', { class: 'flex items-center gap-3 min-w-[200px]' }, [
        h(UAvatar, {
          text: formatContactInitials(contact.name),
          size: 'sm',
          class: 'bg-elevated text-highlighted shrink-0'
        }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'truncate font-medium text-highlighted' }, contact.name),
          h('p', { class: 'truncate text-sm text-dimmed' }, contact.email)
        ])
      ])
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => formatContactType(row.original.type)
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(ContactStatusBadge, { status: row.original.status })
  },
  {
    accessorKey: 'site',
    header: 'Site',
    cell: ({ row }) => row.original.site
  },
  {
    id: 'lastActivity',
    header: 'Last activity',
    cell: ({ row }) => {
      const { lastActivity } = row.original
      return h('div', { class: 'min-w-[120px]' }, [
        h('p', { class: 'text-sm text-highlighted' }, formatRelativeActivity(lastActivity.at)),
        h('div', { class: 'mt-0.5 flex items-center gap-1 text-xs text-dimmed' }, [
          h(resolveComponent('UIcon'), {
            name: activityChannelIcons[lastActivity.channel],
            class: 'size-3'
          }),
          h('span', activityChannelLabels[lastActivity.channel])
        ])
      ])
    }
  },
  {
    accessorKey: 'deals',
    header: 'Deals',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right tabular-nums'
      }
    }
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right tabular-nums font-medium'
      }
    },
    cell: ({ row }) => h(
      'span',
      { class: row.original.status === 'overdue' ? 'text-error' : undefined },
      formatContactBalance(row.original.balance)
    )
  },
  {
    id: 'owner',
    header: 'Owner',
    cell: ({ row }) => h(UAvatar, {
      text: row.original.owner.initials,
      size: 'xs',
      class: 'bg-primary text-inverted'
    }),
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    }
  }
]
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <UTable
      :data="contacts"
      :columns="columns"
      :ui="{
        thead: '[&>tr]:border-b [&>tr]:border-default',
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-wide text-dimmed',
        td: 'px-4 py-4 text-sm text-muted',
        tr: 'border-b border-default last:border-b-0 hover:bg-elevated/50 transition-colors'
      }"
    />
  </div>
</template>
