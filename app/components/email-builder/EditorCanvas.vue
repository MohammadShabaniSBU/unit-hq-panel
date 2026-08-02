<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { EmailBlock } from '~/types/email-builder'
import ParagraphBlock from '~/components/email-builder/blocks/ParagraphBlock.vue'
import HeadingBlock from '~/components/email-builder/blocks/HeadingBlock.vue'
import ImageBlock from '~/components/email-builder/blocks/ImageBlock.vue'
import ButtonBlock from '~/components/email-builder/blocks/ButtonBlock.vue'
import DividerBlock from '~/components/email-builder/blocks/DividerBlock.vue'
import SpacerBlock from '~/components/email-builder/blocks/SpacerBlock.vue'
import UnitSummaryBlock from '~/components/email-builder/blocks/UnitSummaryBlock.vue'
import RawHtmlBlock from '~/components/email-builder/blocks/RawHtmlBlock.vue'
import LegalSectionBlock from '~/components/email-builder/blocks/LegalSectionBlock.vue'
import PartiesBlock from '~/components/email-builder/blocks/PartiesBlock.vue'
import TermsTableBlock from '~/components/email-builder/blocks/TermsTableBlock.vue'
import SignatureAnchorBlock from '~/components/email-builder/blocks/SignatureAnchorBlock.vue'
import PageBreakBlock from '~/components/email-builder/blocks/PageBreakBlock.vue'

const props = defineProps<{
  modelValue: Array<EmailBlock>
  selectedBlockId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [blocks: Array<EmailBlock>]
  'update:selectedBlockId': [id: string | null]
  'delete-block': [id: string]
  'insert-at': [index: number]
  'move-block': [id: string, direction: 'up' | 'down']
}>()

const blocks = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const blockComponentMap: Record<string, unknown> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  unit_summary: UnitSummaryBlock,
  raw_html: RawHtmlBlock,
  legal_section: LegalSectionBlock,
  parties: PartiesBlock,
  terms_table: TermsTableBlock,
  signature_anchor: SignatureAnchorBlock,
  page_break: PageBreakBlock
}

function blockComponent(type: EmailBlock['type']) {
  return blockComponentMap[type] ?? ParagraphBlock
}

function selectBlock(id: string) {
  emit('update:selectedBlockId', id === props.selectedBlockId ? null : id)
}

function deleteBlock(id: string) {
  emit('delete-block', id)
}

function moveBlock(id: string, direction: 'up' | 'down') {
  emit('move-block', id, direction)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-3 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('templates.builder.canvas') }}
    </div>

    <div class="flex-1 overflow-y-auto rounded-lg border border-default bg-white">
      <div
        v-if="blocks.length === 0"
        class="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <UIcon
          name="i-lucide-layout-template"
          class="size-8 text-dimmed"
        />
        <p class="text-sm text-dimmed">
          {{ $t('templates.builder.canvasEmpty') }}
        </p>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          :label="$t('templates.builder.insertBlock')"
          @click="emit('insert-at', 0)"
        />
      </div>

      <VueDraggable
        v-else
        v-model="blocks"
        class="min-h-[400px] py-2"
        handle=".drag-handle"
        :animation="150"
        ghost-class="opacity-40"
        chosen-class="ring-2 ring-primary ring-offset-1"
      >
        <div
          v-for="(block, index) in blocks"
          :key="block.id"
        >
          <button
            type="button"
            class="mx-auto flex h-4 w-full items-center justify-center opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
            :aria-label="$t('templates.builder.insertBetween')"
            @click="emit('insert-at', index)"
          >
            <span class="h-px w-16 bg-primary/40" />
            <UIcon
              name="i-lucide-plus"
              class="mx-1 size-3 text-primary"
            />
            <span class="h-px w-16 bg-primary/40" />
          </button>

          <div
            class="group relative"
            :class="[
              'cursor-pointer transition-all',
              selectedBlockId === block.id
                ? 'ring-2 ring-inset ring-primary'
                : 'ring-1 ring-inset ring-transparent hover:ring-default'
            ]"
            @click="selectBlock(block.id)"
          >
            <component
              :is="blockComponent(block.type)"
              :params="(block.params as never)"
              :selected="selectedBlockId === block.id"
            />

            <div class="absolute right-1.5 top-1.5 hidden items-center gap-1 group-hover:flex">
              <button
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted"
                :disabled="index === 0"
                @click.stop="moveBlock(block.id, 'up')"
              >
                <UIcon
                  name="i-lucide-chevron-up"
                  class="size-3.5"
                />
              </button>
              <button
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted"
                :disabled="index === blocks.length - 1"
                @click.stop="moveBlock(block.id, 'down')"
              >
                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-3.5"
                />
              </button>
              <button
                class="drag-handle flex size-6 cursor-grab items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-highlighted active:cursor-grabbing"
                @click.stop
              >
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="size-3.5"
                />
              </button>
              <button
                class="flex size-6 items-center justify-center rounded bg-white/90 text-dimmed shadow-sm hover:text-error"
                @click.stop="deleteBlock(block.id)"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="size-3.5"
                />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mx-auto flex h-8 w-full items-center justify-center text-dimmed hover:text-primary"
          @click="emit('insert-at', blocks.length)"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4"
          />
        </button>
      </VueDraggable>
    </div>
  </div>
</template>
