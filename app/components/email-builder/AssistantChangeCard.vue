<script setup lang="ts">
import type { AssistOpSummary, AssistSubjectChange } from '~/types/template-assist'

defineProps<{
  summary: AssistOpSummary | null
  subjectChange: AssistSubjectChange | null
  canUndo: boolean
  canShowChanges: boolean
}>()

const emit = defineEmits<{
  'undo': []
  'show-changes': []
}>()
</script>

<template>
  <div class="mt-2 flex flex-col gap-2 rounded-md border border-default bg-muted/40 p-2">
    <p class="text-xs text-dimmed">
      {{ $t('templates.builder.assistant.summary', {
        added: summary?.added ?? 0,
        edited: summary?.edited ?? 0,
        removed: summary?.removed ?? 0
      }) }}
    </p>
    <p
      v-if="subjectChange"
      class="text-xs text-default"
    >
      {{ $t('templates.builder.assistant.subjectChange', { subject: subjectChange.to }) }}
    </p>
    <div class="flex flex-wrap gap-2">
      <UButton
        v-if="canUndo"
        size="xs"
        color="neutral"
        variant="outline"
        icon="i-lucide-undo-2"
        :label="$t('templates.builder.assistant.undo')"
        @click="emit('undo')"
      />
      <UButton
        v-if="canShowChanges"
        size="xs"
        color="neutral"
        variant="ghost"
        :label="$t('templates.builder.assistant.showChanges')"
        @click="emit('show-changes')"
      />
    </div>
  </div>
</template>
