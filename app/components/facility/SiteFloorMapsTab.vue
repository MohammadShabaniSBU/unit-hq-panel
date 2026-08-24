<script setup lang="ts">
import type { ApiSiteMap, ApiSiteMapIdMatch } from '~/types/facility'

const props = defineProps<{
  siteId: number
}>()

const { t } = useI18n()

const siteIdRef = computed(() => props.siteId)
const { maps, pending, error, refresh } = useSiteMaps(siteIdRef)

const showMapForm = ref(false)
const showMapView = ref(false)
const editingMap = ref<ApiSiteMap | null>(null)
const viewingMapId = ref<number | null>(null)
const lastIdMatch = ref<ApiSiteMapIdMatch | null>(null)

watch(siteIdRef, () => {
  refresh()
}, { immediate: true })

function openPasteMap() {
  editingMap.value = null
  lastIdMatch.value = null
  showMapForm.value = true
}

function openPasteEdit(map: ApiSiteMap) {
  editingMap.value = map
  lastIdMatch.value = null
  showMapForm.value = true
}

function openViewMap(map: ApiSiteMap) {
  viewingMapId.value = map.id
  showMapView.value = true
}

function onMapSaved(savedMap: ApiSiteMap) {
  lastIdMatch.value = savedMap.id_match ?? null
  refresh()
}

function onMapDeleted() {
  lastIdMatch.value = null
  refresh()
}

function dismissIdMatch() {
  lastIdMatch.value = null
}

function bucketText(ids: Array<string>) {
  return ids.length ? ids.join(', ') : t('common.emptyValue')
}
</script>

<template>
  <div
    v-if="pending"
    class="flex items-center justify-center py-12"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin text-dimmed"
    />
  </div>

  <div
    v-else-if="error"
    class="rounded-lg border border-error/30 bg-error/5 p-4"
  >
    <p class="text-sm text-error">
      {{ t('pages.sites.mapsLoadError') }}
    </p>
    <UButton
      :label="$t('common.retry')"
      color="neutral"
      variant="outline"
      size="sm"
      class="mt-3"
      @click="refresh()"
    />
  </div>

  <div
    v-else
    class="flex flex-col gap-4"
  >
    <div
      v-if="lastIdMatch"
      class="rounded-lg border border-default bg-elevated/40 p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium text-highlighted">
          {{ t('pages.settings.siteMapMatch.title') }}
        </p>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          :aria-label="$t('common.dismiss')"
          @click="dismissIdMatch"
        />
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ t('pages.settings.siteMapMatch.matched') }} ({{ lastIdMatch.matched.length }})
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ bucketText(lastIdMatch.matched) }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ t('pages.settings.siteMapMatch.orphanShapes') }} ({{ lastIdMatch.orphan_shapes.length }})
          </p>
          <p class="mt-1 text-sm text-warning">
            {{ bucketText(lastIdMatch.orphan_shapes) }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ t('pages.settings.siteMapMatch.uncoveredUnits') }} ({{ lastIdMatch.uncovered_units.length }})
          </p>
          <p class="mt-1 text-sm text-warning">
            {{ bucketText(lastIdMatch.uncovered_units) }}
          </p>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-dimmed">
        {{ t('pages.sites.mapsSection') }}
      </p>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-clipboard-paste"
          :label="$t('pages.sites.pasteSvg')"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openPasteMap"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.sites.addMap')"
          color="primary"
          size="sm"
          :to="`/settings/facility/sites/${siteId}/maps/new`"
        />
      </div>
    </div>

    <div
      v-if="!maps.length"
      class="rounded-lg border border-default py-8 text-center text-sm text-dimmed"
    >
      {{ $t('common.emptyValue') }}
    </div>

    <ul
      v-else
      class="divide-y divide-default rounded-lg border border-default"
    >
      <li
        v-for="map in maps"
        :key="map.id"
        class="flex items-center justify-between gap-3 p-4"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ map.floor_name }}
          </p>
          <UBadge
            :label="String(map.sort_order)"
            color="neutral"
            variant="subtle"
            size="xs"
            class="mt-1"
          />
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <UButton
            icon="i-lucide-eye"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="$t('pages.sites.viewMap')"
            @click="openViewMap(map)"
          />
          <UButton
            icon="i-lucide-code"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="$t('pages.sites.pasteSvg')"
            @click="openPasteEdit(map)"
          />
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="$t('common.edit')"
            :to="`/settings/facility/sites/${siteId}/maps/${map.id}`"
          />
        </div>
      </li>
    </ul>

    <FacilitySiteMapFormSlideover
      v-model:open="showMapForm"
      :site-id="siteId"
      :map="editingMap"
      @saved="onMapSaved"
      @deleted="onMapDeleted"
    />

    <FacilitySiteMapViewModal
      v-model:open="showMapView"
      :map-id="viewingMapId"
    />
  </div>
</template>
