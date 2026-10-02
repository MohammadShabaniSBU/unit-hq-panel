<script setup lang="ts">
import type { OccupancyBandKey } from '~/utils/occupancyBands'
import {
  OCCUPANCY_BANDS,
  OCCUPANCY_BELOW_MAX,
  OCCUPANCY_HEADROOM_MIN,
  OCCUPANCY_TARGET_MAX,
  OCCUPANCY_TARGET_MIN,
  OCCUPANCY_WATCH_MAX,
  OCCUPANCY_WATCH_MIN
} from '~/utils/occupancyBands'

const { t } = useI18n()

function rangeLabel(key: OccupancyBandKey): string | null {
  if (key === 'below') {
    return t('pages.unitClasses.matrix.legend.below', { max: OCCUPANCY_BELOW_MAX })
  }

  if (key === 'watch') {
    return t('pages.unitClasses.matrix.legend.watch', {
      min: OCCUPANCY_WATCH_MIN,
      max: OCCUPANCY_WATCH_MAX
    })
  }

  if (key === 'target') {
    return t('pages.unitClasses.matrix.legend.target', {
      min: OCCUPANCY_TARGET_MIN,
      max: OCCUPANCY_TARGET_MAX
    })
  }

  if (key === 'headroom') {
    return t('pages.unitClasses.matrix.legend.headroom', { min: OCCUPANCY_HEADROOM_MIN })
  }

  return null
}
</script>

<template>
  <ul class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <li
      v-for="band in OCCUPANCY_BANDS"
      :key="band.key"
      class="flex items-center gap-2 text-xs text-muted"
    >
      <span
        class="inline-block size-3 shrink-0 rounded-sm"
        :class="band.swatch"
        aria-hidden="true"
      />
      <template v-if="band.key === 'none'">
        <span>{{ t('pages.unitClasses.matrix.legend.none') }}</span>
      </template>
      <template v-else>
        <span class="text-default">{{ t(band.labelKey) }}</span>
        <span>{{ rangeLabel(band.key) }}</span>
      </template>
    </li>
  </ul>
</template>
