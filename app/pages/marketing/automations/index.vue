<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Automation } from '~/types/automation'
import { NODE_TYPE_DEFINITIONS } from '~/types/automation'

const { automations, pending, error, refresh, deleteAutomation } = useAutomationsList()
const { name, description, submitting, error: createError, fieldErrors, reset, submit } = useAutomationCreate()
const { toggleEnabled } = useAutomationSave()

const showCreateSlider = ref(false)
const deletingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UToggle = resolveComponent('UToggle')
const UIcon = resolveComponent('UIcon')

function triggerLabel(automation: Automation): string {
  const triggerNode = automation.nodes.find(n => n.kind === 'trigger')
  if (!triggerNode) return '—'
  return NODE_TYPE_DEFINITIONS[triggerNode.type]?.label ?? triggerNode.type
}

function triggerIcon(automation: Automation): string {
  const triggerNode = automation.nodes.find(n => n.kind === 'trigger')
  if (!triggerNode) return 'i-lucide-circle-dashed'
  return NODE_TYPE_DEFINITIONS[triggerNode.type]?.icon ?? 'i-lucide-circle'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function handleCreate() {
  const result = await submit()
  if (result) {
    showCreateSlider.value = false
    await navigateTo(`/marketing/automations/${result.id}`)
  }
}

async function handleToggle(automation: Automation, enabled: boolean) {
  await toggleEnabled(automation.id, enabled)
  await refresh()
}

async function handleDelete(id: string) {
  deletingId.value = id
  await deleteAutomation(id)
  confirmDeleteId.value = null
  deletingId.value = null
}

const columns = computed<Array<TableColumn<Automation>>>(() => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', [
      h('a', {
        class: 'font-medium text-highlighted hover:text-primary cursor-pointer',
        onClick: () => navigateTo(`/marketing/automations/${row.original.id}`),
      }, row.original.name),
      row.original.description
        ? h('p', { class: 'mt-0.5 text-xs text-dimmed' }, row.original.description)
        : null,
    ]),
  },
  {
    id: 'trigger',
    header: 'Trigger',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1.5' }, [
      h(UIcon, { name: triggerIcon(row.original), class: 'size-3.5 text-violet-600' }),
      h('span', { class: 'text-sm' }, triggerLabel(row.original)),
    ]),
  },
  {
    id: 'nodes',
    header: 'Steps',
    cell: ({ row }) => h(UBadge, {
      label: `${row.original.nodes.length} nodes`,
      color: 'neutral',
      variant: 'subtle',
      size: 'sm',
    }),
  },
  {
    id: 'enabled',
    header: 'Status',
    cell: ({ row }) => h(UToggle, {
      modelValue: row.original.enabled,
      size: 'sm',
      'onUpdate:modelValue': (val: boolean) => handleToggle(row.original, val),
    }),
  },
  {
    id: 'updatedAt',
    header: 'Last modified',
    cell: ({ row }) => h('span', { class: 'text-sm text-dimmed' }, formatDate(row.original.updatedAt)),
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { class: { th: 'w-20', td: 'w-20 text-right' } },
    cell: ({ row }) => h('div', { class: 'flex items-center justify-end gap-1' }, [
      h(UButton, {
        variant: 'ghost',
        color: 'neutral',
        icon: 'i-lucide-pencil',
        size: 'xs',
        onClick: () => navigateTo(`/marketing/automations/${row.original.id}`),
      }),
      h(UButton, {
        variant: 'ghost',
        color: 'error',
        icon: 'i-lucide-trash-2',
        size: 'xs',
        loading: deletingId.value === row.original.id,
        onClick: () => { confirmDeleteId.value = row.original.id },
      }),
    ]),
  },
])
</script>

<template>
  <UContainer class="py-8">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t('pages.automations.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-dimmed">
          {{ $t('pages.automations.subtitle') }}
        </p>
      </div>
      <UButton
        :label="$t('automations.list.create')"
        color="primary"
        icon="i-lucide-plus"
        @click="showCreateSlider = true"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="pending"
      class="flex h-48 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex h-48 flex-col items-center justify-center gap-3"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-8 text-error"
      />
      <p class="text-sm text-dimmed">
        {{ $t('automations.list.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        variant="outline"
        color="neutral"
        @click="refresh"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="automations.length === 0"
      class="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-default"
    >
      <div class="flex size-14 items-center justify-center rounded-2xl bg-elevated">
        <UIcon
          name="i-lucide-workflow"
          class="size-7 text-dimmed"
        />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium text-highlighted">
          {{ $t('automations.list.emptyTitle') }}
        </p>
        <p class="mt-0.5 text-xs text-dimmed">
          {{ $t('automations.list.emptySubtitle') }}
        </p>
      </div>
      <UButton
        :label="$t('automations.list.create')"
        color="primary"
        icon="i-lucide-plus"
        @click="showCreateSlider = true"
      />
    </div>

    <!-- Table -->
    <div
      v-else
      class="overflow-hidden rounded-xl border border-default"
    >
      <UTable
        :data="automations"
        :columns="columns"
      />
    </div>

    <!-- Create automation slideover -->
    <USlideover
      v-model:open="showCreateSlider"
      :title="$t('automations.create.title')"
      :description="$t('automations.create.description')"
      side="right"
    >
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField
            :label="$t('automations.create.name')"
            :error="fieldErrors.name?.[0]"
            required
          >
            <UInput
              v-model="name"
              :placeholder="$t('automations.create.namePlaceholder')"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('automations.create.description')"
            :error="fieldErrors.description?.[0]"
          >
            <UTextarea
              v-model="description"
              :placeholder="$t('automations.create.descriptionPlaceholder')"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <p
            v-if="createError"
            class="text-sm text-error"
          >
            {{ createError }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 p-4">
          <UButton
            :label="$t('automations.cancel')"
            color="neutral"
            variant="outline"
            @click="showCreateSlider = false; reset()"
          />
          <UButton
            :label="$t('automations.create.submit')"
            color="primary"
            :loading="submitting"
            @click="handleCreate"
          />
        </div>
      </template>
    </USlideover>

    <!-- Delete confirmation modal -->
    <UModal
      v-if="confirmDeleteId"
      :open="!!confirmDeleteId"
      :title="$t('automations.delete.title')"
      @update:open="confirmDeleteId = null"
    >
      <template #body>
        <p class="text-sm text-dimmed">
          {{ $t('automations.delete.confirm') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('automations.cancel')"
            color="neutral"
            variant="outline"
            @click="confirmDeleteId = null"
          />
          <UButton
            :label="$t('automations.delete.submit')"
            color="error"
            :loading="deletingId === confirmDeleteId"
            @click="handleDelete(confirmDeleteId!)"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
