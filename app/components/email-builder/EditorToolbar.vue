<script setup lang="ts">
defineProps<{
  templateName: string
  saving: boolean
  blockCount: number
}>()

const emit = defineEmits<{
  'update:templateName': [value: string]
  save: []
  preview: []
  back: []
}>()
</script>

<template>
  <div class="flex items-center gap-3 border-b border-default bg-default px-4 py-3">
    <UButton
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      :aria-label="$t('forms.emailBuilder.back')"
      @click="emit('back')"
    />

    <div class="flex min-w-0 flex-1 items-center gap-2">
      <UInput
        :model-value="templateName"
        class="w-64 font-medium"
        :placeholder="$t('forms.emailTemplate.namePlaceholder')"
        @update:model-value="(v) => emit('update:templateName', v)"
      />
      <span class="text-xs text-dimmed">
        {{ blockCount }} {{ $t('forms.emailBuilder.blocksCount') }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        :label="$t('forms.emailBuilder.preview')"
        icon="i-lucide-eye"
        color="neutral"
        variant="outline"
        size="sm"
        @click="emit('preview')"
      />
      <UButton
        :label="$t('forms.emailBuilder.save')"
        icon="i-lucide-save"
        size="sm"
        :loading="saving"
        @click="emit('save')"
      />
    </div>
  </div>
</template>
