<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  ApiAttributeDefinition,
  AttributeDefinitionStatus,
  AttributeEntityType
} from '~/types/attribute'
import { ATTRIBUTE_ENTITY_TYPES } from '~/types/attribute'

const {
  searchQuery,
  entityTypeFilter,
  statusFilter,
  definitions,
  pending,
  error,
  refresh
} = useAttributeDefinitionList()

const { t } = useI18n()
const toast = useToast()
const { post } = useApi()

const formDefinition = ref<ApiAttributeDefinition | null>(null)
const showForm = ref(false)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const entityTypeItems = computed(() =>
  [...ATTRIBUTE_ENTITY_TYPES]
    .map(value => ({
      label: t(`forms.attributeDefinition.entityTypes.${value}`),
      value
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

const statusItems = computed(() => [
  {
    label: t('pages.settings.customAttributes.statusActive'),
    value: 'active' as AttributeDefinitionStatus
  },
  {
    label: t('pages.settings.customAttributes.statusArchived'),
    value: 'archived' as AttributeDefinitionStatus
  },
  {
    label: t('pages.settings.customAttributes.statusAll'),
    value: 'all' as AttributeDefinitionStatus
  }
])

const defaultEntityType = computed(() => entityTypeFilter.value)

function openCreate() {
  formDefinition.value = null
  showForm.value = true
}

function openEdit(definition: ApiAttributeDefinition) {
  formDefinition.value = definition
  showForm.value = true
}

function isArchived(definition: ApiAttributeDefinition) {
  return definition.archived_at != null
}

async function handleArchive(definition: ApiAttributeDefinition) {
  try {
    await post(`/api/attribute-definitions/${definition.id}/archive`, {})
    toast.add({
      title: t('pages.settings.customAttributes.archiveSuccessMessage'),
      color: 'success'
    })
    refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.customAttributes.archiveErrorMessage'),
      color: 'error'
    })
  }
}

async function handleUnarchive(definition: ApiAttributeDefinition) {
  try {
    await post(`/api/attribute-definitions/${definition.id}/unarchive`, {})
    toast.add({
      title: t('pages.settings.customAttributes.unarchiveSuccessMessage'),
      color: 'success'
    })
    refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.customAttributes.unarchiveErrorMessage'),
      color: 'error'
    })
  }
}

function entityLabel(entityType: AttributeEntityType) {
  return t(`forms.attributeDefinition.entityTypes.${entityType}`)
}

function typeLabel(type: ApiAttributeDefinition['type']) {
  return t(`forms.attributeDefinition.types.${type}`)
}

const columns = computed<Array<TableColumn<ApiAttributeDefinition>>>(() => [
  {
    accessorKey: 'label',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'font-medium text-highlighted' }, row.original.label),
        ...(isArchived(row.original)
          ? [h(UBadge, {
              label: t('pages.settings.customAttributes.archivedBadge'),
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
    id: 'entity_type',
    header: t('forms.attributeDefinition.entityType'),
    cell: ({ row }) => entityLabel(row.original.entity_type)
  },
  {
    id: 'type',
    header: t('table.type'),
    cell: ({ row }) => typeLabel(row.original.type)
  },
  {
    id: 'group_name',
    header: t('forms.attributeDefinition.groupName'),
    cell: ({ row }) => row.original.group_name ?? t('common.emptyValue')
  },
  {
    id: 'is_required',
    header: t('forms.attributeDefinition.isRequired'),
    cell: ({ row }) => row.original.is_required
      ? h(UBadge, {
          label: t('forms.attributeDefinition.required'),
          color: 'primary',
          variant: 'subtle',
          size: 'sm'
        })
      : t('common.emptyValue')
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
      const archived = isArchived(row.original)
      const items = [[
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            openEdit(row.original)
          }
        },
        archived
          ? {
              label: t('common.unarchive'),
              icon: 'i-lucide-archive-restore',
              onSelect() {
                handleUnarchive(row.original)
              }
            }
          : {
              label: t('common.archive'),
              icon: 'i-lucide-archive',
              onSelect() {
                handleArchive(row.original)
              }
            }
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
      :title="$t('pages.settings.customAttributes.title')"
      :subtitle="$t('pages.settings.customAttributes.subtitle')"
    />

    <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.settings.customAttributes.search')"
          class="w-full sm:w-64"
        />
        <USelect
          v-model="entityTypeFilter"
          :items="entityTypeItems"
          value-key="value"
          class="w-full sm:w-48"
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
        :label="$t('pages.settings.customAttributes.addAttribute')"
        color="primary"
        class="shrink-0"
        @click="openCreate"
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
      :message="$t('pages.settings.customAttributes.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="mt-6 overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="definitions"
        :columns="columns"
      />
    </div>

    <SettingsAttributeDefinitionFormSlideover
      v-model:open="showForm"
      v-model:definition="formDefinition"
      :default-entity-type="defaultEntityType"
      @saved="refresh()"
    />
  </div>
</template>
