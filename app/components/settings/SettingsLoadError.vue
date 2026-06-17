<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="rounded-xl border border-error/30 bg-error/5 p-4">
    <p class="text-sm text-error">
      {{ message }}
    </p>
    <UButton
      :label="$t('common.retry')"
      color="neutral"
      variant="outline"
      size="sm"
      class="mt-3"
      @click="emit('retry')"
    />
  </div>
</template>
