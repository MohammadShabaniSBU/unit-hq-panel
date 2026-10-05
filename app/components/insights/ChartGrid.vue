<script setup lang="ts">
import type { ChartSpec } from '~/types/report'

const props = defineProps<{
  charts: Array<ChartSpec>
}>()

interface ChartGroup {
  id: string
  variants: Array<ChartSpec>
}

const selected = ref<Record<string, string>>({})

const groups = computed<Array<ChartGroup>>(() => {
  const order: Array<string> = []
  const map = new Map<string, Array<ChartSpec>>()
  for (const chart of props.charts) {
    const splitAt = chart.key.indexOf(':')
    const id = splitAt === -1 ? chart.key : chart.key.slice(0, splitAt)
    const existing = map.get(id)
    if (!existing) {
      order.push(id)
      map.set(id, [chart])
    } else {
      existing.push(chart)
    }
  }
  return order.map(id => ({
    id,
    variants: map.get(id) ?? []
  }))
})

function currencyOf(chart: ChartSpec): string {
  if (chart.currency) {
    return chart.currency
  }
  const splitAt = chart.key.indexOf(':')
  return splitAt === -1 ? '' : chart.key.slice(splitAt + 1)
}

function active(group: ChartGroup): ChartSpec {
  const chosen = selected.value[group.id]
  return group.variants.find(chart => currencyOf(chart) === chosen) ?? group.variants[0]!
}

watch(groups, (next) => {
  const copy = { ...selected.value }
  for (const group of next) {
    const first = group.variants[0]
    if (group.variants.length > 1 && first && !copy[group.id]) {
      copy[group.id] = currencyOf(first)
    }
  }
  selected.value = copy
}, { immediate: true })

function selectCurrency(groupId: string, currency: string) {
  selected.value = { ...selected.value, [groupId]: currency }
}
</script>

<template>
  <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
    <UCard
      v-for="group in groups"
      :key="group.id"
      :class="active(group).width === 'full' ? 'lg:col-span-2' : undefined"
      :ui="{ body: 'p-4' }"
    >
      <div
        v-if="group.variants.length > 1"
        class="mb-3 flex justify-end"
      >
        <USelect
          :model-value="currencyOf(active(group))"
          :items="group.variants.map(chart => ({ label: currencyOf(chart), value: currencyOf(chart) }))"
          value-key="value"
          class="w-28"
          @update:model-value="selectCurrency(group.id, String($event))"
        />
      </div>
      <InsightChart :spec="active(group)" />
    </UCard>
  </div>
</template>
