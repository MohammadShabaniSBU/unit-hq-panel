<script setup lang="ts">
import type { ApiSite, ApiSiteMap } from '~/types/facility'
import { formatSiteLocation } from '~/composables/useSitesList'

const props = defineProps<{
  site: ApiSite
}>()

const emit = defineEmits<{
  edit: [site: ApiSite]
}>()

const { t } = useI18n()
const expanded = ref(false)
const showMapForm = ref(false)
const showMapView = ref(false)
const editingMap = ref<ApiSiteMap | null>(null)
const viewingMapId = ref<number | null>(null)
const mapsLoaded = ref(false)

const { maps, pending: mapsPending, error: mapsError, refresh: refreshMaps } = useSiteMaps(() => props.site.id)

const menuItems = computed(() => [[{
  label: t('common.edit'),
  icon: 'i-lucide-pencil',
  onSelect() {
    emit('edit', props.site)
  }
}]])

watch(expanded, async (isExpanded) => {
  if (isExpanded && !mapsLoaded.value) {
    await refreshMaps()
    mapsLoaded.value = true
  }
})

function openCreateMap() {
  editingMap.value = null
  showMapForm.value = true
}

function openEditMap(map: ApiSiteMap) {
  editingMap.value = map
  showMapForm.value = true
}

function openViewMap(map: ApiSiteMap) {
  viewingMapId.value = map.id
  showMapView.value = true
}

function onMapSaved() {
  refreshMaps()
}

function onMapDeleted() {
  refreshMaps()
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-default bg-default shadow-sm">
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-lg font-semibold text-highlighted">
            {{ site.name }}
          </h3>
          <p class="mt-0.5 truncate text-sm text-dimmed">
            {{ site.address ?? $t('common.emptyValue') }}
          </p>
          <p class="mt-0.5 truncate text-sm text-dimmed">
            {{ formatSiteLocation(site) }}
          </p>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-4 border-t border-default pt-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('common.email') }}
          </p>
          <p class="mt-1 truncate text-sm text-highlighted">
            {{ site.contact_email ?? $t('common.emptyValue') }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('common.phone') }}
          </p>
          <p class="mt-1 truncate text-sm text-highlighted">
            {{ site.contact_phone ?? $t('common.emptyValue') }}
          </p>
        </div>
      </div>

      <div class="mt-5 flex items-center justify-end gap-1 border-t border-default pt-4">
        <UButton
          :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="$t('pages.sites.mapsSection')"
          @click="expanded = !expanded"
        />
        <UDropdownMenu
          :items="menuItems"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :aria-label="t('common.actions')"
          />
        </UDropdownMenu>
      </div>

      <div
        v-if="expanded"
        class="mt-4 border-t border-default pt-4"
      >
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-sm font-medium text-dimmed">
            {{ $t('pages.sites.mapsSection') }}
          </h4>
          <UButton
            icon="i-lucide-plus"
            :label="$t('pages.sites.addMap')"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="openCreateMap"
          />
        </div>

        <div
          v-if="mapsPending"
          class="mt-3 flex items-center justify-center py-6"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin text-dimmed"
          />
        </div>

        <div
          v-else-if="mapsError"
          class="mt-3 rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ $t('pages.sites.mapsLoadError') }}
          </p>
        </div>

        <div
          v-else-if="!maps.length"
          class="mt-3 py-4 text-center text-sm text-dimmed"
        >
          {{ $t('common.emptyValue') }}
        </div>

        <ul
          v-else
          class="mt-3 divide-y divide-default"
        >
          <li
            v-for="map in maps"
            :key="map.id"
            class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
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
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="$t('common.edit')"
                @click="openEditMap(map)"
              />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <FacilitySiteMapFormSlideover
      v-model:open="showMapForm"
      :site-id="site.id"
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
