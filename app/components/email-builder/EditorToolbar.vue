<script setup lang="ts">
defineProps<{
  templateName: string
  subject: string
  saving: boolean
  blockCount: number
}>()

const emit = defineEmits<{
  'update:templateName': [value: string]
  'update:subject': [value: string]
  save: []
  preview: []
  back: []
}>()
</script>

<template>
  <div class="flex flex-col gap-2 border-b border-default bg-default px-4 py-3">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        :aria-label="$t('templates.builder.back')"
        @click="emit('back')"
      />

      <div class="flex min-w-0 flex-1 items-center gap-2">
        <UInput
          :model-value="templateName"
          class="w-64 font-medium"
          :placeholder="$t('templates.builder.namePlaceholder')"
          @update:model-value="(v) => emit('update:templateName', String(v))"
        />
        <span class="text-xs text-dimmed">
          {{ blockCount }} {{ $t('templates.builder.blocksCount') }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          :label="$t('templates.builder.preview')"
          icon="i-lucide-eye"
          color="neutral"
          variant="outline"
          size="sm"
          @click="emit('preview')"
        />
        <UButton
          :label="$t('templates.builder.save')"
          icon="i-lucide-save"
          size="sm"
          :loading="saving"
          @click="emit('save')"
        />
      </div>
    </div>

    <div class="flex items-center gap-3 pl-10">
      <UFormField
        :label="$t('templates.builder.subject')"
        class="min-w-[320px] flex-1"
      >
        <UInput
          :model-value="subject"
          class="w-full"
          :placeholder="$t('templates.builder.subjectPlaceholder')"
          @update:model-value="(v) => emit('update:subject', String(v))"
        />
      </UFormField>
      <p class="max-w-sm text-xs text-dimmed">
        {{ $t('templates.builder.renderLatestHelp') }}
      </p>
    </div>
  </div>
</template>
