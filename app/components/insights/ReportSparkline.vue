<script setup lang="ts">
interface SeriesPoint {
  label: string
  unit: number | null
  economic: number | null
}

const props = defineProps<{
  points: Array<SeriesPoint>
  note?: string
}>()

const width = 360
const height = 120
const pad = 16

const values = computed(() => {
  const nums: Array<number> = []
  for (const p of props.points) {
    if (p.unit != null) nums.push(p.unit)
    if (p.economic != null) nums.push(p.economic)
  }
  if (nums.length === 0) {
    return { min: 0, max: 100 }
  }
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = Math.max(max - min, 1)
  // Zoom with padding; label the scale.
  return {
    min: Math.max(0, Math.floor(min - span * 0.1)),
    max: Math.min(100, Math.ceil(max + span * 0.1))
  }
})

function xAt(index: number): number {
  if (props.points.length <= 1) return pad
  return pad + (index / (props.points.length - 1)) * (width - pad * 2)
}

function yAt(value: number | null): number | null {
  if (value == null) return null
  const { min, max } = values.value
  const span = max - min || 1
  return height - pad - ((value - min) / span) * (height - pad * 2)
}

function linePath(key: 'unit' | 'economic'): string {
  const parts: Array<string> = []
  props.points.forEach((p, i) => {
    const y = yAt(p[key])
    if (y == null) return
    const x = xAt(i)
    parts.push(`${parts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  })
  return parts.join(' ')
}
</script>

<template>
  <div>
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      class="h-36 w-full text-primary"
      role="img"
    >
      <line
        :x1="pad"
        :y1="pad"
        :x2="pad"
        :y2="height - pad"
        class="stroke-muted"
        stroke-width="1"
      />
      <line
        :x1="pad"
        :y1="height - pad"
        :x2="width - pad"
        :y2="height - pad"
        class="stroke-muted"
        stroke-width="1"
      />
      <text
        :x="4"
        :y="pad + 4"
        class="fill-muted text-[10px]"
      >
        {{ values.max }}%
      </text>
      <text
        :x="4"
        :y="height - pad"
        class="fill-muted text-[10px]"
      >
        {{ values.min }}%
      </text>
      <path
        :d="linePath('unit')"
        fill="none"
        class="stroke-primary"
        stroke-width="2"
      />
      <path
        :d="linePath('economic')"
        fill="none"
        class="stroke-warning"
        stroke-width="2"
        stroke-dasharray="4 3"
      />
    </svg>
    <p
      v-if="note"
      class="text-muted mt-1 text-xs"
    >
      {{ note }}
    </p>
  </div>
</template>
