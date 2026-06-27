<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { EmailBlock } from '~/types/email-builder'
import TextBlock from '~/components/email-builder/blocks/TextBlock.vue'
import HeadingBlock from '~/components/email-builder/blocks/HeadingBlock.vue'
import ImageBlock from '~/components/email-builder/blocks/ImageBlock.vue'
import ButtonBlock from '~/components/email-builder/blocks/ButtonBlock.vue'
import DividerBlock from '~/components/email-builder/blocks/DividerBlock.vue'
import SpacerBlock from '~/components/email-builder/blocks/SpacerBlock.vue'

const props = defineProps<{
  modelValue: Array<EmailBlock>
  selectedBlockId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [blocks: Array<EmailBlock>]
  'update:selectedBlockId': [id: string | null]
  'delete-block': [id: string]
}>()

const blocks = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const blockComponentMap = {
  text: TextBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
} as const

function blockComponent(type: EmailBlock['type']) {
  return blockComponentMap[type]
}

function selectBlock(id: string) {
  emit('update:selectedBlockId', id === props.selectedBlockId ? null : id)
}

function deleteBlock(id: string) {
  emit('delete-block', id)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-3 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('forms.emailBuilder.canvas') }}
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
          {{ $t('forms.emailBuilder.canvasEmpty') }}
        </p>
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
          v-for="block in blocks"
          :key="block.id"
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
            :props="block.props"
            :selected="selectedBlockId === block.id"
          />

          <div class="absolute right-1.5 top-1.5 hidden items-center gap-1 group-hover:flex">
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

          <div
            v-if="selectedBlockId === block.id"
            class="pointer-events-none absolute right-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-white group-hover:hidden"
          >
            {{ block.type }}
          </div>
        </div>
      </VueDraggable>
    </div>
  </div>
</template>
