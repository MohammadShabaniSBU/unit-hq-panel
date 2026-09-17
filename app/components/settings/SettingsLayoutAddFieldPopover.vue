<script setup lang="ts">
import type { ApiAttributeDefinition } from '~/types/attribute'
import type { ApiNativeFieldMeta } from '~/types/layout'

const props = withDefaults(defineProps<{
  cardLabel: string
  availableNative: Array<ApiNativeFieldMeta>
  availableAttributes: Array<ApiAttributeDefinition>
  busy: boolean
  placement?: 'header' | 'empty'
}>(), {
  placement: 'header'
})

const emit = defineEmits<{
  addNative: [key: string]
  addAttribute: [id: number]
  newAttribute: []
}>()

const { t } = useI18n()
const open = ref(false)
const query = ref('')

const normalizedQuery = computed(() => query.value.trim().toLowerCase())

function matches(label: string, key: string) {
  const q = normalizedQuery.value
  if (!q) {
    return true
  }

  return label.toLowerCase().includes(q) || key.toLowerCase().includes(q)
}

const filteredNative = computed(() =>
  props.availableNative.filter(field => matches(field.label, field.key))
)

const filteredAttributes = computed(() =>
  props.availableAttributes.filter(definition => matches(definition.label, definition.key))
)

const hasResults = computed(() =>
  filteredNative.value.length > 0 || filteredAttributes.value.length > 0
)

function resetQuery() {
  query.value = ''
}

function close() {
  open.value = false
  resetQuery()
}

function onAddNative(key: string) {
  emit('addNative', key)
  close()
}

function onAddAttribute(id: number) {
  emit('addAttribute', id)
  close()
}

function onNewAttribute() {
  emit('newAttribute')
  close()
}

watch(open, (isOpen) => {
  if (!isOpen) {
    resetQuery()
  }
})
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
  >
    <UButton
      icon="i-lucide-plus"
      color="primary"
      variant="outline"
      :size="placement === 'empty' ? 'md' : 'xs'"
      :class="placement === 'empty' ? 'w-full border-dashed' : undefined"
      :label="$t('pages.settings.objectCustomization.addField')"
      :disabled="busy"
    />

    <template #content>
      <div class="flex w-72 flex-col gap-2 p-3">
        <p class="text-xs text-dimmed">
          {{ $t('pages.settings.objectCustomization.addFieldToCard', { card: cardLabel }) }}
        </p>

        <UInput
          v-model="query"
          :placeholder="$t('pages.settings.objectCustomization.searchFields')"
          icon="i-lucide-search"
          size="sm"
          autofocus
        />

        <div class="max-h-80 overflow-y-auto">
          <p
            v-if="normalizedQuery && !hasResults"
            class="px-1 py-2 text-sm text-dimmed"
          >
            {{ $t('pages.settings.objectCustomization.noFieldsMatch', { query }) }}
          </p>

          <template v-else>
            <p class="px-1 pb-1 pt-0.5 text-xs font-medium text-dimmed">
              {{ $t('pages.settings.objectCustomization.nativeFieldsTab') }}
            </p>
            <p
              v-if="filteredNative.length === 0"
              class="px-1 py-1.5 text-sm text-dimmed"
            >
              {{ $t('pages.settings.objectCustomization.noAvailableNative') }}
            </p>
            <button
              v-for="field in filteredNative"
              :key="field.key"
              type="button"
              class="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-elevated"
              :disabled="busy"
              @click="onAddNative(field.key)"
            >
              <span class="min-w-0">
                <span class="block truncate font-medium text-highlighted">{{ field.label }}</span>
                <span class="block truncate text-xs text-dimmed">{{ field.key }} · {{ field.type }}</span>
              </span>
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
                :label="t('pages.settings.objectCustomization.nativeFieldBadge')"
              />
            </button>

            <p class="px-1 pb-1 pt-3 text-xs font-medium text-dimmed">
              {{ $t('pages.settings.objectCustomization.customAttributesTab') }}
            </p>
            <p
              v-if="filteredAttributes.length === 0"
              class="px-1 py-1.5 text-sm text-dimmed"
            >
              {{ $t('pages.settings.objectCustomization.noAvailableAttributes') }}
            </p>
            <button
              v-for="definition in filteredAttributes"
              :key="definition.id"
              type="button"
              class="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-elevated"
              :disabled="busy"
              @click="onAddAttribute(definition.id)"
            >
              <span class="min-w-0">
                <span class="block truncate font-medium text-highlighted">{{ definition.label }}</span>
                <span class="block truncate text-xs text-dimmed">
                  {{ definition.key }} · {{ $t(`forms.attributeDefinition.types.${definition.type}`) }}
                </span>
              </span>
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
                :label="t('pages.settings.objectCustomization.customFieldBadge')"
              />
            </button>
          </template>
        </div>

        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          class="self-start"
          :label="$t('pages.settings.objectCustomization.newAttribute')"
          :disabled="busy"
          @click="onNewAttribute"
        />
      </div>
    </template>
  </UPopover>
</template>
