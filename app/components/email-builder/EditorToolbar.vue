<script setup lang="ts">
withDefaults(defineProps<{
  templateName: string
  subject: string
  saving: boolean
  blockCount: number
  showBlockCount?: boolean
  saveDisabled?: boolean
  subjectReadonly?: boolean
  eyebrow?: string
  showHistory?: boolean
  showUndo?: boolean
  canUndo?: boolean
  canRedo?: boolean
  assistantHint?: boolean
  unsaved?: boolean
  showFocus?: boolean
  focused?: boolean
}>(), {
  showBlockCount: true,
  saveDisabled: false,
  subjectReadonly: false,
  eyebrow: '',
  showHistory: false,
  showUndo: false,
  canUndo: false,
  canRedo: false,
  assistantHint: false,
  unsaved: false,
  showFocus: false,
  focused: false
})

const emit = defineEmits<{
  'update:templateName': [value: string]
  'update:subject': [value: string]
  'save': []
  'preview': []
  'back': []
  'history': []
  'undo': []
  'redo': []
  'focus': []
}>()
</script>

<template>
  <div class="flex flex-col gap-3 border-b border-default bg-default px-4 py-3">
    <p
      v-if="eyebrow"
      class="pl-10 text-xs text-dimmed"
    >
      {{ eyebrow }}
    </p>

    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="$t('templates.builder.back')"
          @click="emit('back')"
        />
        <UInput
          :model-value="templateName"
          variant="none"
          class="min-w-0 flex-1 text-base font-semibold"
          :placeholder="$t('templates.builder.namePlaceholder')"
          @update:model-value="(v) => emit('update:templateName', String(v))"
        />
      </div>

      <span
        v-if="showBlockCount"
        class="text-xs text-dimmed"
      >
        {{ blockCount }} {{ $t('templates.builder.blocksCount') }}
      </span>
      <span v-else />

      <div class="flex items-center justify-end gap-2">
        <UButton
          v-if="showUndo"
          icon="i-lucide-undo-2"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :disabled="!canUndo"
          :aria-label="$t('templates.builder.undo')"
          @click="emit('undo')"
        />
        <UButton
          v-if="showUndo"
          icon="i-lucide-redo-2"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :disabled="!canRedo"
          :aria-label="$t('templates.builder.redo')"
          @click="emit('redo')"
        />
        <UButton
          v-if="showHistory"
          :label="$t('templates.builder.history')"
          icon="i-lucide-history"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('history')"
        />
        <span
          v-if="assistantHint"
          class="text-xs text-dimmed"
        >
          {{ $t('templates.builder.assistant.htmlHint') }}
        </span>
        <UButton
          v-if="showFocus"
          :label="$t('templates.builder.focus')"
          icon="i-lucide-focus"
          :color="focused ? 'primary' : 'neutral'"
          :variant="focused ? 'solid' : 'outline'"
          size="sm"
          @click="emit('focus')"
        />
        <UButton
          :label="$t('templates.builder.preview')"
          icon="i-lucide-eye"
          color="neutral"
          variant="outline"
          size="sm"
          @click="emit('preview')"
        />
        <span
          v-if="unsaved"
          class="text-xs text-dimmed"
        >
          {{ $t('templates.builder.assistant.unsaved') }}
        </span>
        <UButton
          :label="$t('templates.builder.save')"
          icon="i-lucide-save"
          size="sm"
          :loading="saving"
          :disabled="saveDisabled"
          @click="emit('save')"
        />
      </div>
    </div>

    <div class="flex items-center gap-3 pl-10">
      <span class="shrink-0 text-sm text-dimmed">
        {{ $t('templates.builder.subject') }}
      </span>
      <UInput
        :model-value="subject"
        class="min-w-0 flex-1"
        :placeholder="$t('templates.builder.subjectPlaceholder')"
        :readonly="subjectReadonly"
        @update:model-value="(v) => emit('update:subject', String(v))"
      />
    </div>
  </div>
</template>
