<script setup lang="ts">
import type { InsertableBlockType, TemplateBuilderChannel } from '~/types/email-builder'
import { insertableTypesForChannel } from '~/types/email-builder'

const props = withDefaults(defineProps<{
  channel?: TemplateBuilderChannel
}>(), {
  channel: 'email'
})

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

const allItems = computed<Array<PaletteItem>>(() => [
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
  },
  {
    type: 'legal_section',
    label: t('templates.builder.blockLegalSection'),
    icon: 'i-lucide-scale',
    description: t('templates.builder.blockLegalSectionDesc')
  },
  {
    type: 'parties',
    label: t('templates.builder.blockParties'),
    icon: 'i-lucide-users',
    description: t('templates.builder.blockPartiesDesc')
  },
  {
    type: 'terms_table',
    label: t('templates.builder.blockTermsTable'),
    icon: 'i-lucide-table',
    description: t('templates.builder.blockTermsTableDesc')
  },
  {
    type: 'signature_anchor',
    label: t('templates.builder.blockSignatureAnchor'),
    icon: 'i-lucide-pen-line',
    description: t('templates.builder.blockSignatureAnchorDesc')
  },
  {
    type: 'page_break',
    label: t('templates.builder.blockPageBreak'),
    icon: 'i-lucide-separator-horizontal',
    description: t('templates.builder.blockPageBreakDesc')
  }
])

const paletteItems = computed(() => {
  const allowed = new Set(insertableTypesForChannel(props.channel))
  return allItems.value.filter((item) => {
    if (item.type === 'heading') return allowed.has('heading')
    return allowed.has(item.type)
  })
})
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
