<script setup lang="ts">
import type { OccupancyCellVariant, OccupancyCounts } from '~/utils/occupancyBands'
import { bandClasses, bandFor, bandStyle, percentOf } from '~/utils/occupancyBands'

const props = defineProps<{
  siteName: string
  classCode: string
  counts: OccupancyCounts
  variant: OccupancyCellVariant
}>()

const { t } = useI18n()

const band = computed(() => bandFor(props.counts.occupied, props.counts.rentable))

const rounded = computed(() => {
  const value = percentOf(props.counts.occupied, props.counts.rentable)

  if (value === null) {
    return null
  }

  return Math.round(value)
})

const primary = computed(() => {
  if (rounded.value === null) {
    return t('common.emptyValue')
  }

  return `${rounded.value}%`
})

const status = computed(() => {
  if (band.value !== 'none') {
    return t(bandStyle(band.value).labelKey)
  }

  if (props.counts.offered) {
    return t('pages.unitClasses.matrix.noUnits')
  }

  return t('pages.unitClasses.matrix.bands.none')
})

const detail = computed(() => {
  if (band.value === 'none') {
    return null
  }

  const free = t('pages.unitClasses.matrix.free', { n: props.counts.free })

  if (props.counts.held_blocking > 0) {
    return `${free} · ${t('pages.unitClasses.matrix.held', { n: props.counts.held_blocking })}`
  }

  return free
})

const secondary = computed(() => detail.value ?? status.value)

const label = computed(() => {
  const parts = [props.siteName, props.classCode, primary.value, status.value]

  if (detail.value !== null) {
    parts.push(detail.value)
  }

  return parts.join(' · ')
})

const tone = computed(() => bandClasses(band.value, props.variant))

const percentClass = computed(() => {
  if (props.variant === 'total' || props.variant === 'corner') {
    return 'text-xl font-bold leading-none'
  }

  return 'text-[1rem] font-medium leading-none'
})
</script>

<template>
  <td
    class="min-w-24 px-3 py-2 text-center align-middle tabular-nums whitespace-nowrap"
    :class="tone"
    :aria-label="label"
    :title="label"
  >
    <p :class="percentClass">
      {{ primary }}
    </p>
    <p class="mt-1 text-xs leading-none">
      {{ secondary }}
    </p>
  </td>
</template>
