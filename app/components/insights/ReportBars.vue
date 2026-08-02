<script setup lang="ts">
import { formatMoney } from '~/composables/useMoney'

interface BarPoint {
  label: string
  charged: string
  allocated: string
  currency: string
}

const props = defineProps<{
  points: Array<BarPoint>
  note?: string
}>()

const { locale } = useI18n()

const maxValue = computed(() => {
  let max = 0
  for (const p of props.points) {
    max = Math.max(max, Number(p.charged) || 0, Number(p.allocated) || 0)
  }
  return max > 0 ? max : 1
})

function heightPct(amount: string): number {
  return Math.max(0, Math.min(100, ((Number(amount) || 0) / maxValue.value) * 100))
}
</script>

<template>
  <div>
    <div class="flex h-40 items-end gap-2">
      <div
        v-for="point in points"
        :key="point.label"
        class="flex min-w-0 flex-1 flex-col items-center gap-1"
      >
        <div class="flex h-32 w-full items-end justify-center gap-0.5">
          <div
            class="bg-primary/30 w-1/2 rounded-t"
            :style="{ height: `${heightPct(point.charged)}%` }"
            :title="formatMoney(point.charged, point.currency, locale)"
          />
          <div
            class="bg-primary w-1/2 rounded-t"
            :style="{ height: `${heightPct(point.allocated)}%` }"
            :title="formatMoney(point.allocated, point.currency, locale)"
          />
        </div>
        <span class="text-muted truncate text-[10px]">
          {{ point.label }}
        </span>
      </div>
    </div>
    <p class="text-muted mt-2 text-xs">
      {{ $t('pages.insights.dashboard.collectionsAxis') }}
      <span v-if="note"> — {{ note }}</span>
    </p>
  </div>
</template>
