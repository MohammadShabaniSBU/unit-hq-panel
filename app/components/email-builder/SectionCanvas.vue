<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { EmailDocumentV2, EmailLayout, EmailSection, EmailSelection } from '~/types/email-builder'
import type { BlockOp } from '~/utils/emailBlockOps'
import { blockLabelKey } from '~/types/email-builder'
import {
  collectIds,
  columnCount,
  createSection,
  duplicateSection,
  sectionHasRawHtml
} from '~/utils/emailBlocks'
import ParagraphBlock from '~/components/email-builder/blocks/ParagraphBlock.vue'
import HeadingBlock from '~/components/email-builder/blocks/HeadingBlock.vue'
import ImageBlock from '~/components/email-builder/blocks/ImageBlock.vue'
import ButtonBlock from '~/components/email-builder/blocks/ButtonBlock.vue'
import DividerBlock from '~/components/email-builder/blocks/DividerBlock.vue'
import SpacerBlock from '~/components/email-builder/blocks/SpacerBlock.vue'
import UnitSummaryBlock from '~/components/email-builder/blocks/UnitSummaryBlock.vue'
import RawHtmlBlock from '~/components/email-builder/blocks/RawHtmlBlock.vue'
import InfoRowsBlock from '~/components/email-builder/blocks/InfoRowsBlock.vue'
import ListBlock from '~/components/email-builder/blocks/ListBlock.vue'
import CalloutBlock from '~/components/email-builder/blocks/CalloutBlock.vue'
import LogoHeaderBlock from '~/components/email-builder/blocks/LogoHeaderBlock.vue'
import FooterSocialBlock from '~/components/email-builder/blocks/FooterSocialBlock.vue'

const props = withDefaults(defineProps<{
  doc: EmailDocumentV2
  selection: EmailSelection | null
  readonly?: boolean
  highlightedIds?: Array<string>
}>(), {
  readonly: false,
  highlightedIds: () => []
})

const emit = defineEmits<{
  'ops': [ops: Array<BlockOp>]
  'select': [selection: EmailSelection]
  'drag-finish': [payload: { snapshot: EmailDocumentV2, op: BlockOp | null }]
  'insert-at': [payload: { columnId: string, index: number }]
}>()

const { t } = useI18n()
const slots = useSlots()
const pickerIndex = ref<number | null>(null)
const layoutOpenId = ref<string | null>(null)
const dragSnapshot = ref<EmailDocumentV2 | null>(null)

const blockComponentMap: Record<string, unknown> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  unit_summary: UnitSummaryBlock,
  raw_html: RawHtmlBlock,
  info_rows: InfoRowsBlock,
  list: ListBlock,
  callout: CalloutBlock,
  logo_header: LogoHeaderBlock,
  footer_social: FooterSocialBlock
}

const columnWidths: Record<EmailLayout, Array<string>> = {
  '100': ['100%'],
  '50_50': ['50%', '50%'],
  '33_67': ['33%', '67%'],
  '67_33': ['67%', '33%'],
  '33_33_33': ['33.33%', '33.33%', '33.34%']
}

const paddingClass: Record<string, string> = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-8'
}

interface DragEvent {
  oldIndex?: number
  newIndex?: number
  from?: HTMLElement
  to?: HTMLElement
  item?: HTMLElement
}

function blockComponent(type: string) {
  return blockComponentMap[type] ?? ParagraphBlock
}

function openEmptyPicker() {
  pickerIndex.value = 0
}

function isSelected(kind: EmailSelection['kind'], id: string) {
  return props.selection?.kind === kind && props.selection.id === id
}

function isHighlighted(id: string) {
  return props.highlightedIds.includes(id)
}

function columnWidth(layout: EmailLayout, index: number): string {
  return columnWidths[layout][index] ?? `${Math.floor(100 / Math.max(columnCount(layout), 1))}%`
}

function addSection(index: number, layout: EmailLayout) {
  if (props.readonly) return
  pickerIndex.value = null
  emit('ops', [{
    op: 'add_section',
    index,
    section: createSection(layout, collectIds(props.doc))
  }])
}

function chooseLayout(section: EmailSection, layout: EmailLayout) {
  layoutOpenId.value = null
  if (props.readonly || section.layout === layout) return
  emit('ops', [{ op: 'set_section_layout', section_id: section.id, layout }])
}

function moveSection(sectionId: string, index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= props.doc.sections.length) return
  emit('ops', [{ op: 'move_section', section_id: sectionId, to_index: target }])
}

function duplicate(section: EmailSection, index: number) {
  emit('ops', [{
    op: 'add_section',
    index: index + 1,
    section: duplicateSection(section, collectIds(props.doc))
  }])
}

function moveBlock(columnId: string, blockId: string, index: number, direction: -1 | 1, total: number) {
  const target = index + direction
  if (target < 0 || target >= total) return
  emit('ops', [{ op: 'move_block', block_id: blockId, to_column_id: columnId, to_index: target }])
}

function onDragStart() {
  dragSnapshot.value = JSON.parse(JSON.stringify(props.doc)) as EmailDocumentV2
}

function columnIdOf(node: HTMLElement | undefined): string | null {
  if (!node) return null
  return node.closest('[data-column-id]')?.getAttribute('data-column-id') ?? node.getAttribute('data-column-id')
}

function onDragEnd(event: DragEvent) {
  const snapshot = dragSnapshot.value
  dragSnapshot.value = null
  if (!snapshot) return
  const blockId = event.item?.dataset.blockId
  const toColumnId = columnIdOf(event.to)
  const fromColumnId = columnIdOf(event.from)
  if (!blockId || !toColumnId || event.newIndex == null || event.oldIndex == null) {
    emit('drag-finish', { snapshot, op: null })
    return
  }
  if (fromColumnId === toColumnId && event.oldIndex === event.newIndex) {
    emit('drag-finish', { snapshot, op: null })
    return
  }
  emit('drag-finish', {
    snapshot,
    op: {
      op: 'move_block',
      block_id: blockId,
      to_column_id: toColumnId,
      to_index: event.newIndex
    }
  })
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        {{ $t('templates.builder.canvas') }}
      </div>
      <span class="text-xs text-dimmed">
        {{ $t('templates.builder.canvasWidth') }}
      </span>
    </div>

    <div class="mx-auto w-full max-w-[600px] flex-1 overflow-y-auto rounded-lg border border-default bg-white shadow-sm">
      <div
        v-if="doc.sections.length === 0"
        class="flex min-h-[400px] flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <slot
          v-if="slots.empty && pickerIndex !== 0"
          name="empty"
          :insert="openEmptyPicker"
        />
        <EmailBuilderLayoutPicker
          v-else-if="slots.empty && pickerIndex === 0 && !readonly"
          @select="(layout) => addSection(0, layout)"
        />
        <template v-else>
          <UIcon
            name="i-lucide-layout-template"
            class="size-8 text-dimmed"
          />
          <p class="text-sm text-dimmed">
            {{ $t('templates.builder.canvasEmptySections') }}
          </p>
          <EmailBuilderLayoutPicker
            v-if="!readonly && pickerIndex === 0"
            @select="(layout) => addSection(0, layout)"
          />
          <UButton
            v-else-if="!readonly"
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            :label="$t('templates.builder.addSection')"
            @click="pickerIndex = 0"
          />
        </template>
      </div>

      <div
        v-else
        class="min-h-[400px] py-2"
      >
        <template
          v-for="(section, sectionIndex) in doc.sections"
          :key="section.id"
        >
          <div
            v-if="!readonly"
            class="px-4 py-1"
          >
            <EmailBuilderLayoutPicker
              v-if="pickerIndex === sectionIndex"
              @select="(layout) => addSection(sectionIndex, layout)"
            />
            <button
              v-else
              type="button"
              class="mx-auto flex h-4 w-full items-center justify-center opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
              :aria-label="$t('templates.builder.addSection')"
              @click="pickerIndex = sectionIndex"
            >
              <span class="h-px w-16 bg-primary/40" />
              <UIcon
                name="i-lucide-plus"
                class="mx-1 size-3 text-primary"
              />
              <span class="h-px w-16 bg-primary/40" />
            </button>
          </div>

          <div
            class="group relative mx-3 mb-3 border border-dashed border-default"
            :class="isSelected('section', section.id) ? 'ring-2 ring-primary' : isHighlighted(section.id) ? 'ring-2 ring-amber-400' : ''"
            :data-section-id="section.id"
            :style="section.params.background_color ? { backgroundColor: section.params.background_color } : undefined"
            @click="emit('select', { kind: 'section', id: section.id })"
          >
            <div
              v-if="!readonly"
              class="absolute right-1 top-1 z-10 hidden items-center gap-1 group-hover:flex"
              @click.stop
            >
              <div class="relative">
                <button
                  type="button"
                  class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted"
                  :aria-label="$t('templates.builder.layout')"
                  @click="layoutOpenId = layoutOpenId === section.id ? null : section.id"
                >
                  <UIcon
                    name="i-lucide-columns-2"
                    class="size-3.5"
                  />
                </button>
                <div
                  v-if="layoutOpenId === section.id"
                  class="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-default bg-white shadow-md"
                >
                  <EmailBuilderLayoutPicker
                    :locked="sectionHasRawHtml(section)"
                    @select="(layout) => chooseLayout(section, layout)"
                  />
                </div>
              </div>
              <button
                type="button"
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted"
                :disabled="sectionIndex === 0"
                :aria-label="$t('templates.builder.moveUp')"
                @click="moveSection(section.id, sectionIndex, -1)"
              >
                <UIcon
                  name="i-lucide-chevron-up"
                  class="size-3.5"
                />
              </button>
              <button
                type="button"
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted"
                :disabled="sectionIndex === doc.sections.length - 1"
                :aria-label="$t('templates.builder.moveDown')"
                @click="moveSection(section.id, sectionIndex, 1)"
              >
                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-3.5"
                />
              </button>
              <button
                type="button"
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted"
                :aria-label="$t('templates.builder.duplicateSection')"
                @click="duplicate(section, sectionIndex)"
              >
                <UIcon
                  name="i-lucide-copy"
                  class="size-3.5"
                />
              </button>
              <button
                type="button"
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-error"
                :aria-label="$t('templates.builder.deleteSection')"
                @click="emit('ops', [{ op: 'remove_section', section_id: section.id }])"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="size-3.5"
                />
              </button>
            </div>

            <div
              class="flex"
              :class="paddingClass[section.params.padding] ?? 'p-4'"
            >
              <div
                v-for="(column, columnIndex) in section.columns"
                :key="column.id"
                class="min-w-0"
                :class="isSelected('column', column.id) ? 'ring-2 ring-inset ring-primary' : isHighlighted(column.id) ? 'ring-2 ring-inset ring-amber-400' : ''"
                :style="{ width: columnWidth(section.layout, columnIndex) }"
                :data-column-id="column.id"
                @click.stop="emit('select', { kind: 'column', id: column.id })"
              >
                <VueDraggable
                  :model-value="column.blocks"
                  class="min-h-16"
                  group="email-blocks"
                  handle=".drag-handle"
                  :animation="150"
                  :disabled="readonly"
                  ghost-class="opacity-40"
                  @start="onDragStart"
                  @end="onDragEnd"
                >
                  <div
                    v-for="(block, blockIndex) in column.blocks"
                    :key="block.id"
                    :data-block-id="block.id"
                    class="group/block relative"
                    :class="isSelected('block', block.id) ? 'ring-2 ring-inset ring-primary' : isHighlighted(block.id) ? 'ring-2 ring-inset ring-amber-400' : 'ring-1 ring-inset ring-transparent hover:ring-default'"
                    @click.stop="emit('select', { kind: 'block', id: block.id })"
                  >
                    <button
                      v-if="!readonly"
                      type="button"
                      class="mx-auto flex h-3 w-full items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100"
                      :aria-label="$t('templates.builder.insertBetween')"
                      @click.stop="emit('insert-at', { columnId: column.id, index: blockIndex })"
                    >
                      <span class="h-px w-10 bg-primary/40" />
                    </button>
                    <span
                      v-if="isSelected('block', block.id)"
                      class="absolute left-2 top-0 z-10 -translate-y-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                    >
                      {{ t(blockLabelKey(block.type, block.params as { level?: number })) }}
                    </span>
                    <component
                      :is="blockComponent(block.type)"
                      :params="(block.params as never)"
                      :selected="isSelected('block', block.id)"
                    />
                    <div
                      v-if="!readonly"
                      class="absolute right-1 top-1 hidden items-center gap-1 group-hover/block:flex"
                      @click.stop
                    >
                      <button
                        type="button"
                        class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm"
                        :disabled="blockIndex === 0"
                        :aria-label="$t('templates.builder.moveUp')"
                        @click="moveBlock(column.id, block.id, blockIndex, -1, column.blocks.length)"
                      >
                        <UIcon
                          name="i-lucide-chevron-up"
                          class="size-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm"
                        :disabled="blockIndex === column.blocks.length - 1"
                        :aria-label="$t('templates.builder.moveDown')"
                        @click="moveBlock(column.id, block.id, blockIndex, 1, column.blocks.length)"
                      >
                        <UIcon
                          name="i-lucide-chevron-down"
                          class="size-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        class="drag-handle flex size-6 cursor-grab items-center justify-center rounded bg-white/90 text-dimmed shadow-sm"
                        @click.stop
                      >
                        <UIcon
                          name="i-lucide-grip-vertical"
                          class="size-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-error"
                        :aria-label="$t('templates.builder.delete')"
                        @click="emit('ops', [{ op: 'remove_block', block_id: block.id }])"
                      >
                        <UIcon
                          name="i-lucide-trash-2"
                          class="size-3.5"
                        />
                      </button>
                    </div>
                  </div>
                </VueDraggable>
                <button
                  v-if="!readonly && column.blocks.length === 0"
                  type="button"
                  class="m-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1 rounded-md border border-dashed border-default py-3 text-xs text-dimmed hover:border-primary/50 hover:text-primary"
                  @click.stop="emit('select', { kind: 'column', id: column.id })"
                >
                  <UIcon
                    name="i-lucide-plus"
                    class="size-3.5"
                  />
                  {{ $t('templates.builder.addBlock') }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <div
          v-if="!readonly"
          class="px-4 pb-4"
        >
          <EmailBuilderLayoutPicker
            v-if="pickerIndex === doc.sections.length"
            @select="(layout) => addSection(doc.sections.length, layout)"
          />
          <button
            v-else
            type="button"
            class="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-default py-2.5 text-xs text-dimmed hover:border-primary/50 hover:text-primary"
            @click="pickerIndex = doc.sections.length"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-3.5"
            />
            {{ $t('templates.builder.addSection') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
