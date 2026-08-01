<script setup lang="ts">
const props = defineProps<{
  completed: number
  total: number
  waiting?: boolean
  hint?: string | null
  compact?: boolean
}>()

const dots = computed(() => {
  const total = Math.max(0, props.total)
  const completed = Math.min(Math.max(0, props.completed), total)
  return Array.from({ length: total }, (_, index) => {
    if (index < completed) return 'done' as const
    if (index === completed && props.waiting) return 'waiting' as const
    if (index === completed) return 'current' as const
    return 'upcoming' as const
  })
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-1.5">
      <span
        v-for="(state, index) in dots"
        :key="index"
        class="inline-flex size-2.5 rounded-full border"
        :class="{
          'border-primary bg-primary': state === 'done',
          'border-warning bg-warning/30 ring-2 ring-warning/40': state === 'waiting' || state === 'current',
          'border-muted bg-transparent': state === 'upcoming'
        }"
      />
      <span
        v-if="total === 0"
        class="text-xs text-muted"
      >—</span>
    </div>
    <p
      v-if="!compact && hint"
      class="text-xs text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
