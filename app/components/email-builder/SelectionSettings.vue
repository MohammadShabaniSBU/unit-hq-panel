<script setup lang="ts">
import type {
  EmailBlock,
  EmailDocumentV2,
  EmailLayout,
  EmailPadding,
  EmailSelection
} from '~/types/email-builder'
import { blockLabelKey } from '~/types/email-builder'
import type { BlockOp } from '~/utils/emailBlockOps'
import { findBlock, findColumn, findSectionIndex } from '~/utils/emailBlockOps'
import { sectionHasRawHtml } from '~/utils/emailBlocks'

const props = withDefaults(defineProps<{
  doc: EmailDocumentV2
  selection: EmailSelection | null
  familyId: string
  purpose: string
  readonly?: boolean
}>(), {
  readonly: false
})

const emit = defineEmits<{
  'select': [selection: EmailSelection]
  'ops': [ops: Array<BlockOp>, coalesceKey?: string]
  'upload-image': [file: File]
}>()

const { t } = useI18n()

const sectionIndex = computed(() => {
  if (!props.selection) return -1
  if (props.selection.kind === 'section') return findSectionIndex(props.doc, props.selection.id)
  if (props.selection.kind === 'column') return findColumn(props.doc, props.selection.id)?.sectionIndex ?? -1
  return findBlock(props.doc, props.selection.id)?.sectionIndex ?? -1
})

const section = computed(() => sectionIndex.value >= 0 ? props.doc.sections[sectionIndex.value] ?? null : null)

const columnLocation = computed(() => {
  if (!props.selection) return null
  if (props.selection.kind === 'column') return findColumn(props.doc, props.selection.id)
  if (props.selection.kind === 'block') {
    const block = findBlock(props.doc, props.selection.id)
    if (!block) return null
    return findColumn(props.doc, block.column.id)
  }
  return null
})

const blockLocation = computed(() =>
  props.selection?.kind === 'block' ? findBlock(props.doc, props.selection.id) : null
)

const selectedBlock = computed(() => (blockLocation.value?.block ?? null) as EmailBlock | null)

interface Crumb {
  kind: EmailSelection['kind']
  id: string
  label: string
}

const crumbs = computed<Array<Crumb>>(() => {
  const items: Array<Crumb> = []
  if (!section.value) return items
  items.push({
    kind: 'section',
    id: section.value.id,
    label: t('templates.builder.sectionLabel', { n: sectionIndex.value + 1 })
  })
  if (columnLocation.value) {
    items.push({
      kind: 'column',
      id: columnLocation.value.column.id,
      label: t('templates.builder.columnLabel', { n: columnLocation.value.columnIndex + 1 })
    })
  }
  if (blockLocation.value) {
    const block = blockLocation.value.block
    items.push({
      kind: 'block',
      id: block.id,
      label: t(blockLabelKey(block.type, block.params as { level?: number }))
    })
  }
  return items
})

const paddingOptions = computed(() => [
  { label: t('templates.builder.paddingNone'), value: 'none' },
  { label: t('templates.builder.paddingSm'), value: 'sm' },
  { label: t('templates.builder.paddingMd'), value: 'md' },
  { label: t('templates.builder.paddingLg'), value: 'lg' }
])

const layoutOptions = computed(() => {
  const all: Array<{ label: string, value: EmailLayout }> = [
    { label: t('templates.builder.layout100'), value: '100' },
    { label: t('templates.builder.layout5050'), value: '50_50' },
    { label: t('templates.builder.layout3367'), value: '33_67' },
    { label: t('templates.builder.layout6733'), value: '67_33' },
    { label: t('templates.builder.layout333333'), value: '33_33_33' }
  ]
  if (section.value && sectionHasRawHtml(section.value)) return all.filter(item => item.value === '100')
  return all
})

const backgroundText = computed(() => section.value?.params.background_color ?? '')

function patchSection(params: { background_color?: string | null, padding?: EmailPadding, stack_on_mobile?: boolean }) {
  if (!section.value || props.readonly) return
  const key = Object.keys(params)[0]
  emit('ops', [{
    op: 'update_section',
    section_id: section.value.id,
    params
  }], key ? `section:${section.value.id}:${key}` : undefined)
}

function onLayout(value: unknown) {
  const current = section.value
  if (!current || props.readonly) return
  emit('ops', [{
    op: 'set_section_layout',
    section_id: current.id,
    layout: value as EmailLayout
  }])
}

function onBackground(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') {
    patchSection({ background_color: null })
    return
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) patchSection({ background_color: trimmed })
}

function onBlock(updated: EmailBlock) {
  const current = blockLocation.value?.block
  if (!current || props.readonly) return
  const prev = current.params
  const next = updated.params as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) patch[key] = next[key]
  }
  const keys = Object.keys(patch)
  if (keys.length === 0) return
  emit(
    'ops',
    [{ op: 'update_block', block_id: updated.id, params: patch }],
    keys.length === 1 ? `${updated.id}:${keys[0]}` : undefined
  )
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="crumbs.length > 0"
      class="flex flex-wrap items-center gap-1 text-xs"
    >
      <template
        v-for="(crumb, index) in crumbs"
        :key="crumb.id"
      >
        <span
          v-if="index > 0"
          class="text-dimmed"
        >›</span>
        <button
          type="button"
          class="rounded px-1 py-0.5 text-highlighted hover:bg-muted"
          @click="emit('select', { kind: crumb.kind, id: crumb.id })"
        >
          {{ crumb.label }}
        </button>
      </template>
    </div>

    <div
      v-if="!selection"
      class="flex flex-col items-center gap-2 py-8 text-center"
    >
      <UIcon
        name="i-lucide-mouse-pointer-click"
        class="size-6 text-dimmed"
      />
      <p class="text-xs text-dimmed">
        {{ $t('templates.builder.settingsEmptyV2') }}
      </p>
    </div>

    <div
      v-else-if="selection.kind === 'section' && section"
      class="flex flex-col gap-3 rounded-lg border border-default p-3"
    >
      <div class="text-xs font-semibold text-highlighted">
        {{ $t('templates.builder.sectionLabel', { n: sectionIndex + 1 }) }}
      </div>
      <UFormField :label="$t('templates.builder.layout')">
        <USelect
          :model-value="section.layout"
          :items="layoutOptions"
          value-key="value"
          class="w-full"
          :disabled="readonly"
          @update:model-value="onLayout"
        />
      </UFormField>
      <UFormField :label="$t('templates.builder.sectionBackground')">
        <UInput
          :model-value="backgroundText"
          class="w-full"
          placeholder="#RRGGBB"
          :readonly="readonly"
          @update:model-value="(value) => onBackground(String(value))"
        />
      </UFormField>
      <UFormField :label="$t('templates.builder.sectionPadding')">
        <USelect
          :model-value="section.params.padding"
          :items="paddingOptions"
          value-key="value"
          class="w-full"
          :disabled="readonly"
          @update:model-value="(value) => patchSection({ padding: value as EmailPadding })"
        />
      </UFormField>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-highlighted">
          {{ $t('templates.builder.stackOnMobile') }}
        </span>
        <USwitch
          :model-value="section.params.stack_on_mobile !== false"
          :disabled="readonly"
          @update:model-value="(value) => patchSection({ stack_on_mobile: Boolean(value) })"
        />
      </div>
    </div>

    <p
      v-else-if="selection.kind === 'column'"
      class="py-6 text-center text-xs text-dimmed"
    >
      {{ $t('templates.builder.columnNoSettings') }}
    </p>

    <EmailBuilderBlockSettings
      v-else-if="selectedBlock"
      :block="selectedBlock"
      :family-id="familyId"
      :purpose="purpose"
      :readonly="readonly"
      :position="blockLocation ? { current: blockLocation.blockIndex + 1, total: blockLocation.column.blocks.length } : null"
      @update:block="onBlock"
      @upload-image="(file) => emit('upload-image', file)"
    />
  </div>
</template>
