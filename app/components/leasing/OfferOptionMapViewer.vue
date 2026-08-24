<script setup lang="ts">
import { highlightOfferMapUnit, injectSiteMapSvg } from '~/composables/useUnitsMapView'

const props = defineProps<{
  optionId: number | null
  token?: string | null
}>()

const svgHostRef = useTemplateRef<HTMLElement>('svgHost')

const {
  map,
  pending,
  error,
  notFound,
  refresh
} = useOfferOptionMap(
  () => props.optionId,
  () => props.token
)

const caption = computed(() => {
  if (!map.value) {
    return ''
  }

  if (map.value.site_name) {
    return `${map.value.site_name} · ${map.value.floor_name}`
  }

  return map.value.floor_name
})

function renderMap() {
  const host = svgHostRef.value
  if (!host) {
    return
  }

  injectSiteMapSvg(host, map.value?.svg_map)

  if (map.value?.unit_number) {
    highlightOfferMapUnit(host, map.value.unit_number)
  }
}

watch(
  () => map.value,
  async () => {
    await nextTick()
    renderMap()
  }
)

onMounted(() => {
  renderMap()
})
</script>

<template>
  <div class="flex h-full min-h-64 flex-col">
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="notFound"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center"
    >
      <UIcon
        name="i-lucide-map-pin-off"
        class="size-8 text-dimmed"
      />
      <p class="text-sm font-medium text-highlighted">
        {{ $t('forms.offer.mapEmptyTitle') }}
      </p>
      <p class="max-w-sm text-sm text-dimmed">
        {{ $t('forms.offer.mapEmptyBody') }}
      </p>
    </div>

    <div
      v-else-if="error"
      class="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center"
    >
      <p class="text-sm text-error">
        {{ $t('forms.offer.mapLoadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="map"
      class="flex min-h-0 flex-1 flex-col"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
        <p class="min-w-0 break-words text-sm font-medium text-highlighted">
          {{ caption }}
        </p>
        <span class="inline-flex items-center gap-1.5 text-xs text-dimmed">
          <span class="size-2.5 rounded-sm bg-amber-300 ring-2 ring-amber-500" />
          {{ $t('forms.offer.mapHighlight') }}
        </span>
      </div>

      <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-default bg-neutral-100 p-3 dark:bg-neutral-950">
        <div
          ref="svgHost"
          class="offer-option-map-svg w-full"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.offer-option-map-svg :deep(.storage-unit:not([data-offer-focus="1"]) rect.unit),
.offer-option-map-svg :deep(.storage-unit:not([data-offer-focus="1"]) rect) {
  opacity: 0.55;
}

.offer-option-map-svg :deep([data-offer-focus="1"] rect.unit),
.offer-option-map-svg :deep([data-offer-focus="1"] rect) {
  fill: #fde047 !important;
  stroke: #ca8a04 !important;
  stroke-width: 3 !important;
}

.offer-option-map-svg :deep(svg) {
  width: 100%;
  height: auto;
  display: block;
}
</style>
