<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { AttributeEntityType } from '~/types/attribute'
import { ATTRIBUTE_ENTITY_TYPES } from '~/types/attribute'
import type { ApiAttributeGroup } from '~/types/layout'
import { layoutFieldLabel } from '~/types/layout'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

function resolveEntityType(value: unknown): AttributeEntityType {
  if (typeof value === 'string' && (ATTRIBUTE_ENTITY_TYPES as ReadonlyArray<string>).includes(value)) {
    return value as AttributeEntityType
  }

  return 'contact'
}

const entityType = computed(() => resolveEntityType(route.params.entity))

watch(() => route.params.entity, (value) => {
  if (value !== entityType.value) {
    void router.replace(`/settings/data-model/objects/${entityType.value}/layout`)
  }
}, { immediate: true })

const {
  customization,
  groups,
  availableNative,
  availableAttributes,
  pending,
  saving,
  error,
  refresh,
  createGroup,
  renameGroup,
  deleteGroup,
  reorderGroups,
  addNativeField,
  addAttributeField,
  removeField,
  reorderFields,
  moveGroup,
  moveField
} = useObjectCustomization(entityType)

const expandedGroupIds = ref<Array<number>>([])
const showAttributeForm = ref(false)
const renamingGroupId = ref<number | null>(null)
const renameDraft = ref('')
const creatingCard = ref(false)
const orderedGroups = ref<Array<ApiAttributeGroup>>([])

const initialLoad = computed(() => pending.value && customization.value == null)
const busy = computed(() => pending.value || saving.value || creatingCard.value)

watch(groups, (items) => {
  orderedGroups.value = items.map(group => ({
    ...group,
    fields: [...group.fields]
  }))

  if (expandedGroupIds.value.length === 0 && items.length > 0) {
    expandedGroupIds.value = items.map(group => group.id)
  }
}, { immediate: true })

function sameIds(left: Array<number>, right: Array<number>) {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

function toggleExpanded(groupId: number) {
  if (expandedGroupIds.value.includes(groupId)) {
    expandedGroupIds.value = expandedGroupIds.value.filter(id => id !== groupId)
    return
  }

  expandedGroupIds.value = [...expandedGroupIds.value, groupId]
}

function isExpanded(groupId: number) {
  return expandedGroupIds.value.includes(groupId)
}

function ensureExpanded(groupId: number) {
  if (!expandedGroupIds.value.includes(groupId)) {
    expandedGroupIds.value = [...expandedGroupIds.value, groupId]
  }
}

async function onCreateCard() {
  creatingCard.value = true
  const existingIds = new Set(orderedGroups.value.map(group => group.id))
  try {
    await createGroup(t('pages.settings.objectCustomization.newCardLabel'))
    toast.add({
      title: t('pages.settings.objectCustomization.cardCreated'),
      color: 'success'
    })

    const created = groups.value.find(group => !existingIds.has(group.id))
    if (created && !expandedGroupIds.value.includes(created.id)) {
      expandedGroupIds.value = [...expandedGroupIds.value, created.id]
    }
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  } finally {
    creatingCard.value = false
  }
}

function startRename(groupId: number, label: string) {
  renamingGroupId.value = groupId
  renameDraft.value = label
}

async function commitRename(groupId: number) {
  const label = renameDraft.value.trim()
  renamingGroupId.value = null

  if (!label) {
    return
  }

  try {
    await renameGroup(groupId, label)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onDeleteGroup(groupId: number) {
  try {
    await deleteGroup(groupId)
    toast.add({
      title: t('pages.settings.objectCustomization.cardDeleted'),
      color: 'success'
    })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onMoveGroup(groupId: number, direction: -1 | 1) {
  try {
    await moveGroup(groupId, direction)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onMoveField(groupId: number, fieldId: number, direction: -1 | 1) {
  try {
    await moveField(groupId, fieldId, direction)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onRemoveField(fieldId: number) {
  try {
    await removeField(fieldId)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onAddNative(groupId: number, key: string) {
  ensureExpanded(groupId)
  try {
    await addNativeField(groupId, key)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onAddAttribute(groupId: number, definitionId: number) {
  ensureExpanded(groupId)
  try {
    await addAttributeField(groupId, definitionId)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onCardReorder() {
  const next = orderedGroups.value.map(group => group.id)
  const current = groups.value.map(group => group.id)
  if (sameIds(next, current)) {
    return
  }

  try {
    await reorderGroups(next)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onFieldReorder(groupId: number) {
  const group = orderedGroups.value.find(item => item.id === groupId)
  const source = groups.value.find(item => item.id === groupId)
  if (!group || !source) {
    return
  }

  const next = group.fields.map(field => field.id)
  const current = source.fields.map(field => field.id)
  if (sameIds(next, current)) {
    return
  }

  try {
    await reorderFields(groupId, next)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

function onAttributeSaved() {
  refresh()
}
</script>

<template>
  <div>
    <SettingsDataModelObjectHeader
      :entity="entityType"
      tab="layout"
    />

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.settings.objectCustomization.newCard')"
        color="primary"
        :loading="creatingCard"
        :disabled="busy"
        @click="onCreateCard"
      />
    </div>

    <div
      v-if="initialLoad"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <SettingsLoadError
      v-else-if="error && !customization"
      :message="$t('pages.settings.objectCustomization.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="relative mt-6"
    >
      <UProgress
        v-if="busy"
        class="pointer-events-none absolute inset-x-0 top-0 z-10 -translate-y-full"
        size="xs"
      />

      <div
        :class="busy ? 'pointer-events-none' : undefined"
        :aria-busy="busy"
      >
        <p
          v-if="orderedGroups.length === 0"
          class="text-sm text-dimmed"
        >
          {{ $t('pages.settings.objectCustomization.noCards') }}
        </p>

        <VueDraggable
          v-else
          v-model="orderedGroups"
          class="grid grid-cols-1 items-start gap-4 md:grid-cols-2"
          handle=".card-drag-handle"
          :animation="150"
          ghost-class="opacity-40"
          chosen-class="kanban-chosen"
          :disabled="busy"
          @end="onCardReorder"
        >
          <div
            v-for="(group, groupIndex) in orderedGroups"
            :key="group.id"
            class="rounded-lg border border-default bg-default"
          >
            <div class="flex items-center gap-2 border-b border-default px-3 py-2">
              <span
                class="card-drag-handle shrink-0 cursor-grab text-dimmed active:cursor-grabbing"
                :aria-label="$t('pages.settings.objectCustomization.reorderCard')"
              >
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="size-4"
                />
              </span>

              <UButton
                :icon="isExpanded(group.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                @click="toggleExpanded(group.id)"
              />

              <div class="min-w-0 flex-1">
                <div
                  v-if="renamingGroupId === group.id"
                  class="flex items-center gap-2"
                >
                  <UInput
                    v-model="renameDraft"
                    size="sm"
                    class="w-full"
                    @keyup.enter="commitRename(group.id)"
                    @blur="commitRename(group.id)"
                  />
                </div>
                <div
                  v-else
                  class="flex flex-col"
                >
                  <span class="truncate text-sm font-medium text-highlighted">
                    {{ group.label }}
                  </span>
                  <span class="truncate text-xs text-dimmed">
                    {{ group.is_system
                      ? $t('pages.settings.objectCustomization.systemCard')
                      : group.key }}
                  </span>
                </div>
              </div>

              <SettingsLayoutAddFieldPopover
                :card-label="group.label"
                :available-native="availableNative"
                :available-attributes="availableAttributes"
                :busy="busy"
                placement="header"
                @add-native="onAddNative(group.id, $event)"
                @add-attribute="onAddAttribute(group.id, $event)"
                @new-attribute="showAttributeForm = true"
              />

              <div class="flex shrink-0 items-center gap-0.5">
                <UButton
                  icon="i-lucide-arrow-up"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :disabled="groupIndex === 0"
                  @click="onMoveGroup(group.id, -1)"
                />
                <UButton
                  icon="i-lucide-arrow-down"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :disabled="groupIndex === orderedGroups.length - 1"
                  @click="onMoveGroup(group.id, 1)"
                />
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  @click="startRename(group.id, group.label)"
                />
                <UButton
                  v-if="!group.is_system"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  square
                  @click="onDeleteGroup(group.id)"
                />
              </div>
            </div>

            <div v-if="isExpanded(group.id)">
              <VueDraggable
                v-if="group.fields.length > 0"
                v-model="group.fields"
                class="divide-y divide-default"
                handle=".field-drag-handle"
                :animation="150"
                ghost-class="opacity-40"
                chosen-class="kanban-chosen"
                :disabled="busy"
                @end="onFieldReorder(group.id)"
              >
                <div
                  v-for="(field, fieldIndex) in group.fields"
                  :key="field.id"
                  class="flex items-center gap-2 px-4 py-2.5"
                >
                  <span
                    class="field-drag-handle shrink-0 cursor-grab text-dimmed active:cursor-grabbing"
                    :aria-label="$t('pages.settings.objectCustomization.reorderField')"
                  >
                    <UIcon
                      name="i-lucide-grip-vertical"
                      class="size-4"
                    />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm text-highlighted">
                      {{ layoutFieldLabel(field) }}
                    </p>
                    <p class="truncate text-xs text-dimmed">
                      {{ field.field_type === 'native'
                        ? $t('pages.settings.objectCustomization.nativeField')
                        : $t('pages.settings.objectCustomization.customField') }}
                      <template v-if="field.native_field_key">
                        · {{ field.native_field_key }}
                      </template>
                      <template v-else-if="field.attribute_definition">
                        · {{ field.attribute_definition.key }}
                      </template>
                    </p>
                  </div>
                  <UButton
                    icon="i-lucide-arrow-up"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    :disabled="fieldIndex === 0"
                    @click="onMoveField(group.id, field.id, -1)"
                  />
                  <UButton
                    icon="i-lucide-arrow-down"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    :disabled="fieldIndex === group.fields.length - 1"
                    @click="onMoveField(group.id, field.id, 1)"
                  />
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    @click="onRemoveField(field.id)"
                  />
                </div>
              </VueDraggable>

              <div
                v-if="group.fields.length === 0"
                class="px-4 py-3"
              >
                <SettingsLayoutAddFieldPopover
                  :card-label="group.label"
                  :available-native="availableNative"
                  :available-attributes="availableAttributes"
                  :busy="busy"
                  placement="empty"
                  @add-native="onAddNative(group.id, $event)"
                  @add-attribute="onAddAttribute(group.id, $event)"
                  @new-attribute="showAttributeForm = true"
                />
              </div>
            </div>
          </div>
        </VueDraggable>
      </div>
    </div>

    <SettingsAttributeDefinitionFormSlideover
      v-model:open="showAttributeForm"
      :default-entity-type="entityType"
      @saved="onAttributeSaved"
    />
  </div>
</template>
