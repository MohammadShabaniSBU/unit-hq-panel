<script setup lang="ts">
defineProps<{
  open: boolean
  loading: boolean
  currentHtml: string
  assistantHtml: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'use-assistant': []
  'keep-mine': []
}>()
</script>

<template>
  <UModal
    :open="open"
    :title="$t('templates.builder.assistant.conflictTitle')"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-xs font-medium text-dimmed">
            {{ $t('templates.builder.assistant.conflictMine') }}
          </p>
          <div
            v-if="loading"
            class="flex h-80 items-center justify-center"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-dimmed"
            />
          </div>
          <iframe
            v-else-if="currentHtml"
            class="h-80 w-full rounded border border-default bg-white"
            sandbox=""
            :srcdoc="currentHtml"
            :title="$t('templates.builder.assistant.conflictMine')"
          />
          <p
            v-else
            class="text-sm text-dimmed"
          >
            {{ $t('templates.builder.assistant.previewUnavailable') }}
          </p>
        </div>
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-xs font-medium text-dimmed">
            {{ $t('templates.builder.assistant.conflictAssistant') }}
          </p>
          <div
            v-if="loading"
            class="flex h-80 items-center justify-center"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-dimmed"
            />
          </div>
          <iframe
            v-else-if="assistantHtml"
            class="h-80 w-full rounded border border-default bg-white"
            sandbox=""
            :srcdoc="assistantHtml"
            :title="$t('templates.builder.assistant.conflictAssistant')"
          />
          <p
            v-else
            class="text-sm text-dimmed"
          >
            {{ $t('templates.builder.assistant.previewUnavailable') }}
          </p>
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :label="$t('templates.builder.assistant.keepMine')"
          @click="emit('keep-mine')"
        />
        <UButton
          :label="$t('templates.builder.assistant.useAssistant')"
          @click="emit('use-assistant')"
        />
      </div>
    </template>
  </UModal>
</template>
