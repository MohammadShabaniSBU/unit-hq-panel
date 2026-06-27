<script setup lang="ts">
import type { BlockType } from '~/types/email-builder'

const emit = defineEmits<{
  'add-block': [type: BlockType, meta?: { level?: 1 | 2 | 3 }]
}>()

interface PaletteItem {
  type: BlockType
  label: string
  icon: string
  description: string
  meta?: { level?: 1 | 2 | 3 }
}

const { t } = useI18n()

const paletteItems = computed<Array<PaletteItem>>(() => [
  {
    type: 'text',
    label: t('forms.emailBuilder.blockText'),
    icon: 'i-lucide-type',
    description: t('forms.emailBuilder.blockTextDesc')
  },
  {
    type: 'heading',
    label: t('forms.emailBuilder.blockH1'),
    icon: 'i-lucide-heading-1',
    description: t('forms.emailBuilder.blockH1Desc'),
    meta: { level: 1 }
  },
  {
    type: 'heading',
    label: t('forms.emailBuilder.blockH2'),
    icon: 'i-lucide-heading-2',
    description: t('forms.emailBuilder.blockH2Desc'),
    meta: { level: 2 }
  },
  {
    type: 'heading',
    label: t('forms.emailBuilder.blockH3'),
    icon: 'i-lucide-heading-3',
    description: t('forms.emailBuilder.blockH3Desc'),
    meta: { level: 3 }
  },
  {
    type: 'image',
    label: t('forms.emailBuilder.blockImage'),
    icon: 'i-lucide-image',
    description: t('forms.emailBuilder.blockImageDesc')
  },
  {
    type: 'button',
    label: t('forms.emailBuilder.blockButton'),
    icon: 'i-lucide-square-mouse-pointer',
    description: t('forms.emailBuilder.blockButtonDesc')
  },
  {
    type: 'divider',
    label: t('forms.emailBuilder.blockDivider'),
    icon: 'i-lucide-minus',
    description: t('forms.emailBuilder.blockDividerDesc')
  },
  {
    type: 'spacer',
    label: t('forms.emailBuilder.blockSpacer'),
    icon: 'i-lucide-arrow-up-down',
    description: t('forms.emailBuilder.blockSpacerDesc')
  }
])
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="mb-1 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('forms.emailBuilder.palette') }}
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
