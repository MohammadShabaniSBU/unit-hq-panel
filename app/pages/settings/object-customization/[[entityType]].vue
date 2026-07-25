<script setup lang="ts">
import type { AttributeEntityType } from '~/types/attribute'
import { ATTRIBUTE_ENTITY_TYPES } from '~/types/attribute'
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

const entityType = computed({
  get: () => resolveEntityType(route.params.entityType),
  set: (value: AttributeEntityType) => {
    router.push(`/settings/object-customization/${value}`)
  }
})

watch(() => route.params.entityType, (value) => {
  if (!value) {
    router.replace('/settings/object-customization/contact')
  }
}, { immediate: true })

const {
  groups,
  availableNative,
  availableAttributes,
  pending,
  error,
  refresh,
  createGroup,
  renameGroup,
  deleteGroup,
  addNativeField,
  addAttributeField,
  removeField,
  moveGroup,
  moveField
} = useObjectCustomization(entityType)

const selectedGroupId = ref<number | null>(null)
const expandedGroupIds = ref<Array<number>>([])
const addFieldTab = ref<'native' | 'attributes'>('native')
const showAttributeForm = ref(false)
const renamingGroupId = ref<number | null>(null)
const renameDraft = ref('')
const creatingCard = ref(false)

const entityTypeItems = computed(() =>
  [...ATTRIBUTE_ENTITY_TYPES]
    .map(value => ({
      label: t(`forms.attributeDefinition.entityTypes.${value}`),
      value
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

const addFieldTabItems = computed(() => [
  {
    label: t('pages.settings.objectCustomization.nativeFieldsTab'),
    value: 'native',
    slot: 'native'
  },
  {
    label: t('pages.settings.objectCustomization.customAttributesTab'),
    value: 'attributes',
    slot: 'attributes'
  }
])

watch(groups, (items) => {
  if (items.length === 0) {
    selectedGroupId.value = null
    return
  }

  if (selectedGroupId.value == null || !items.some(group => group.id === selectedGroupId.value)) {
    selectedGroupId.value = items[0]!.id
  }

  if (expandedGroupIds.value.length === 0) {
    expandedGroupIds.value = items.map(group => group.id)
  }
}, { immediate: true })

const selectedGroup = computed(() =>
  groups.value.find(group => group.id === selectedGroupId.value) ?? null
)

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

async function onCreateCard() {
  creatingCard.value = true
  try {
    await createGroup(t('pages.settings.objectCustomization.newCardLabel'))
    toast.add({
      title: t('pages.settings.objectCustomization.cardCreated'),
      color: 'success'
    })
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

async function onAddNative(key: string) {
  if (!selectedGroup.value) {
    toast.add({
      title: t('pages.settings.objectCustomization.selectCardFirst'),
      color: 'warning'
    })
    return
  }

  try {
    await addNativeField(selectedGroup.value.id, key)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.objectCustomization.saveError'),
      color: 'error'
    })
  }
}

async function onAddAttribute(definitionId: number) {
  if (!selectedGroup.value) {
    toast.add({
      title: t('pages.settings.objectCustomization.selectCardFirst'),
      color: 'warning'
    })
    return
  }

  try {
    await addAttributeField(selectedGroup.value.id, definitionId)
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
    <SettingsSectionHeader
      :title="$t('pages.settings.objectCustomization.title')"
      :subtitle="$t('pages.settings.objectCustomization.subtitle')"
    />

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <USelect
        v-model="entityType"
        :items="entityTypeItems"
        value-key="value"
        class="w-full sm:w-56"
      />
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.settings.objectCustomization.newCard')"
        color="primary"
        :loading="creatingCard"
        @click="onCreateCard"
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
      :message="$t('pages.settings.objectCustomization.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]"
    >
      <div class="flex flex-col gap-3">
        <p
          v-if="groups.length === 0"
          class="text-sm text-dimmed"
        >
          {{ $t('pages.settings.objectCustomization.noCards') }}
        </p>

        <div
          v-for="(group, groupIndex) in groups"
          :key="group.id"
          class="rounded-lg border border-default"
          :class="selectedGroupId === group.id ? 'bg-primary/10' : 'bg-default'"
        >
          <div class="flex items-center gap-2 border-b border-default px-3 py-2">
            <UButton
              :icon="isExpanded(group.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              @click="toggleExpanded(group.id)"
            />

            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              @click="selectedGroupId = group.id"
            >
              <div
                v-if="renamingGroupId === group.id"
                class="flex items-center gap-2"
                @click.stop
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
            </button>

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
                :disabled="groupIndex === groups.length - 1"
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

          <div
            v-if="isExpanded(group.id)"
            class="divide-y divide-default"
          >
            <p
              v-if="group.fields.length === 0"
              class="px-4 py-3 text-sm text-dimmed"
            >
              {{ $t('pages.settings.objectCustomization.emptyCard') }}
            </p>

            <div
              v-for="(field, fieldIndex) in group.fields"
              :key="field.id"
              class="flex items-center gap-2 px-4 py-2.5"
            >
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
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-default p-4">
        <div class="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 class="text-sm font-medium text-highlighted">
              {{ $t('pages.settings.objectCustomization.addField') }}
            </h3>
            <p class="mt-0.5 text-xs text-dimmed">
              {{ selectedGroup
                ? $t('pages.settings.objectCustomization.addFieldTo', { card: selectedGroup.label })
                : $t('pages.settings.objectCustomization.selectCardFirst') }}
            </p>
          </div>
        </div>

        <UTabs
          v-model="addFieldTab"
          :items="addFieldTabItems"
          variant="link"
          color="neutral"
          class="w-full gap-3"
          :ui="{ list: 'gap-4' }"
        >
          <template #native>
            <div class="flex flex-col gap-1">
              <p
                v-if="availableNative.length === 0"
                class="text-sm text-dimmed"
              >
                {{ $t('pages.settings.objectCustomization.noAvailableNative') }}
              </p>
              <button
                v-for="field in availableNative"
                :key="field.key"
                type="button"
                class="rounded-md px-3 py-2 text-left text-sm hover:bg-elevated"
                :disabled="!selectedGroup"
                @click="onAddNative(field.key)"
              >
                <span class="font-medium text-highlighted">{{ field.label }}</span>
                <span class="mt-0.5 block text-xs text-dimmed">{{ field.key }} · {{ field.type }}</span>
              </button>
            </div>
          </template>

          <template #attributes>
            <div class="flex flex-col gap-2">
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="outline"
                size="sm"
                :label="$t('pages.settings.objectCustomization.newAttribute')"
                class="self-start"
                @click="showAttributeForm = true"
              />

              <p
                v-if="availableAttributes.length === 0"
                class="text-sm text-dimmed"
              >
                {{ $t('pages.settings.objectCustomization.noAvailableAttributes') }}
              </p>
              <button
                v-for="definition in availableAttributes"
                :key="definition.id"
                type="button"
                class="rounded-md px-3 py-2 text-left text-sm hover:bg-elevated"
                :disabled="!selectedGroup"
                @click="onAddAttribute(definition.id)"
              >
                <span class="font-medium text-highlighted">{{ definition.label }}</span>
                <span class="mt-0.5 block text-xs text-dimmed">
                  {{ definition.key }} · {{ $t(`forms.attributeDefinition.types.${definition.type}`) }}
                </span>
              </button>
            </div>
          </template>
        </UTabs>
      </div>
    </div>

    <SettingsAttributeDefinitionFormSlideover
      v-model:open="showAttributeForm"
      :default-entity-type="entityType"
      @saved="onAttributeSaved"
    />
  </div>
</template>
