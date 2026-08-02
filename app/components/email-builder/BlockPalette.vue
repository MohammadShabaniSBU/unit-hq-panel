<script setup lang="ts">
import type { InsertableBlockType } from '~/types/email-builder'

const emit = defineEmits<{
  'add-block': [type: InsertableBlockType, meta?: { level?: 1 | 2 }]
}>()

interface PaletteItem {
  type: InsertableBlockType
  label: string
  icon: string
  description: string
  meta?: { level?: 1 | 2 }
}

const { t } = useI18n()

const paletteItems = computed<Array<PaletteItem>>(() => [
  {
    type: 'paragraph',
    label: t('templates.builder.blockParagraph'),
    icon: 'i-lucide-type',
    description: t('templates.builder.blockParagraphDesc')
  },
  {
    type: 'heading',
    label: t('templates.builder.blockH1'),
    icon: 'i-lucide-heading-1',
    description: t('templates.builder.blockH1Desc'),
    meta: { level: 1 }
  },
  {
    type: 'heading',
    label: t('templates.builder.blockH2'),
    icon: 'i-lucide-heading-2',
    description: t('templates.builder.blockH2Desc'),
    meta: { level: 2 }
  },
  {
    type: 'image',
    label: t('templates.builder.blockImage'),
    icon: 'i-lucide-image',
    description: t('templates.builder.blockImageDesc')
  },
  {
    type: 'button',
    label: t('templates.builder.blockButton'),
    icon: 'i-lucide-square-mouse-pointer',
    description: t('templates.builder.blockButtonDesc')
  },
  {
    type: 'divider',
    label: t('templates.builder.blockDivider'),
    icon: 'i-lucide-minus',
    description: t('templates.builder.blockDividerDesc')
  },
  {
    type: 'spacer',
    label: t('templates.builder.blockSpacer'),
    icon: 'i-lucide-arrow-up-down',
    description: t('templates.builder.blockSpacerDesc')
  },
  {
    type: 'unit_summary',
    label: t('templates.builder.blockUnitSummary'),
    icon: 'i-lucide-warehouse',
    description: t('templates.builder.blockUnitSummaryDesc')
  }
])
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="mb-1 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('templates.builder.palette') }}
    </div>

    <button
      v-for="item in paletteItems"
      :key="`${item.type}-${item.meta?.level ?? ''}`"
      class="flex w-full items-center gap-3 rounded-lg border border-default bg-default px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-95"
      @click="emit('add-block', item.type, item.meta)"
    >
      <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-highlighted">
        <UIcon
          :name="item.icon"
          class="size-4"
        />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-highlighted">
          {{ item.label }}
        </p>
        <p class="truncate text-xs text-dimmed">
          {{ item.description }}
        </p>
      </div>
    </button>
  </div>
</template>
