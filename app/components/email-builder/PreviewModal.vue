<script setup lang="ts">
import type { EmailBlock, TextBlockProps, HeadingBlockProps, ImageBlockProps, ButtonBlockProps, DividerBlockProps, SpacerBlockProps } from '~/types/email-builder'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  blocks: Array<EmailBlock>
  templateName: string
}>()

function blockToHtml(block: EmailBlock): string {
  switch (block.type) {
    case 'heading': {
      const p = block.props as HeadingBlockProps
      const sizes: Record<1 | 2 | 3, string> = { 1: '32px', 2: '24px', 3: '20px' }
      const weights: Record<1 | 2 | 3, string> = { 1: '700', 2: '600', 3: '600' }
      return `<div style="text-align:${p.align};padding:12px 24px;">
        <h${p.level} style="font-size:${sizes[p.level]};font-weight:${weights[p.level]};color:${p.color};line-height:1.3;margin:0;">${p.content}</h${p.level}>
      </div>`
    }
    case 'text': {
      const p = block.props as TextBlockProps
      return `<div style="text-align:${p.align};padding:12px 24px;">
        <p style="font-size:${p.fontSize}px;color:${p.color};line-height:1.6;margin:0;">${p.content}</p>
      </div>`
    }
    case 'image': {
      const p = block.props as ImageBlockProps
      return p.src
        ? `<div style="text-align:${p.align};padding:12px 24px;">
            <img src="${p.src}" alt="${p.alt}" style="max-width:${p.width}px;width:100%;display:inline-block;" />
          </div>`
        : ''
    }
    case 'button': {
      const p = block.props as ButtonBlockProps
      return `<div style="text-align:${p.align};padding:12px 24px;">
        <a href="${p.href}" style="display:inline-block;background-color:${p.backgroundColor};color:${p.textColor};padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${p.label}</a>
      </div>`
    }
    case 'divider': {
      const p = block.props as DividerBlockProps
      return `<div style="padding:12px 24px;">
        <hr style="border:none;border-top:${p.thickness}px solid ${p.color};margin:0;" />
      </div>`
    }
    case 'spacer': {
      const p = block.props as SpacerBlockProps
      return `<div style="height:${p.height}px;"></div>`
    }
    default:
      return ''
  }
}

const previewHtml = computed(() => {
  const body = props.blocks.map(blockToHtml).join('\n')
  return `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;background:#ffffff;">${body}</div>`
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="templateName"
    :ui="{ content: 'max-w-2xl w-full' }"
  >
    <template #body>
      <div class="overflow-auto rounded-lg border border-default bg-gray-50 p-4">
        <div v-html="previewHtml" />
      </div>
    </template>
  </UModal>
</template>
