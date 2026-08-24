<script setup lang="ts">
import type { ApiSiteMap, ApiUnit } from '~/types/facility'
import { cloneFloorMapScene, matchFloorMapScene, useFloorMapEditor } from '~/composables/useFloorMapEditor'
import FacilityMapBuilderPalette from '~/components/facility/map-builder/MapBuilderPalette.vue'
import FacilityMapBuilderCanvas from '~/components/facility/map-builder/MapBuilderCanvas.vue'
import FacilityMapBuilderInspector from '~/components/facility/map-builder/MapBuilderInspector.vue'

const props = defineProps<{
  siteId: number
  mapId?: number
}>()

const { t } = useI18n()
const toast = useToast()
const { get, post, patch, del } = useApi()
const editor = reactive(useFloorMapEditor())

const floorName = ref('')
const sortOrder = ref(0)
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const loadError = ref<string | null>(null)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, Array<string>>>({})

const isEditing = computed(() => Boolean(props.mapId))
const backTo = computed(() => `/settings/facility/sites/${props.siteId}?tab=floor-maps`)

const {
  data: unitsData,
  pending: unitsPending
} = useAsyncData(
  () => `map-builder-units-${props.siteId}`,
  async () => {
    const response = await get<Array<ApiUnit>>('/api/units', {
      site_id: props.siteId,
      for_map: 1
    })
    return response.data
  }
)

const units = computed(() => unitsData.value ?? [])
const unitNumbers = computed(() => units.value.map(unit => unit.unit_number))
const match = computed(() => matchFloorMapScene(editor.scene, unitNumbers.value))

async function load() {
  loading.value = true
  loadError.value = null

  try {
    if (!props.mapId) {
      floorName.value = ''
      sortOrder.value = 0
      editor.loadEmpty()
      return
    }

    const response = await get<ApiSiteMap>(`/api/site-maps/${props.mapId}`)
    const map = response.data
    floorName.value = map.floor_name
    sortOrder.value = map.sort_order

    if (map.scene) {
      editor.loadScene(map.scene)
    } else {
      editor.loadFromSvg(map.svg_map)
    }
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    loadError.value = fetchError.data?.message ?? t('pages.settings.mapBuilder.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKeyDown)
})

watch(() => props.mapId, () => {
  void load()
})

const assignedSet = computed(() => editor.assignedUnitNumbers)

function goBack() {
  return navigateTo(backTo.value)
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function onKeyDown(event: KeyboardEvent) {
  if (isTypingTarget(event.target)) {
    return
  }

  const key = event.key.toLowerCase()

  if ((event.metaKey || event.ctrlKey) && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      editor.redo()
    } else {
      editor.undo()
    }
    return
  }

  if ((event.metaKey || event.ctrlKey) && key === 'y') {
    event.preventDefault()
    editor.redo()
    return
  }

  if (key === 'delete' || key === 'backspace') {
    event.preventDefault()
    editor.removeSelected()
    return
  }

  if (key === 'v') {
    editor.setTool('select')
  }

  if (key === 'u') {
    editor.setTool('unit')
  }

  if (key === 'e') {
    editor.setTool('entrance')
  }

  if (key === 'escape') {
    editor.select(null)
    editor.setTool('select')
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function onPlace(type: 'unit' | 'entrance', x: number, y: number) {
  editor.placeItem(type, x, y)
}

function onInspectorUpdate(
  id: string,
  patch: { x?: number, y?: number, width?: number, height?: number, unit_number?: string | null }
) {
  editor.updateItem(id, patch)
}

function onPlaceUnit(unit: ApiUnit) {
  const n = editor.scene.items.length
  const x = 80 + (n % 6) * 96
  const y = 80 + Math.floor(n / 6) * 96
  editor.placeAssignedUnit(unit, x, y)
}

function onSelectUnit(unitNumber: string) {
  const item = editor.scene.items.find(
    entry => entry.type === 'unit' && entry.unit_number === unitNumber
  )
  editor.select(item?.id ?? null)
}

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

async function save() {
  if (!floorName.value.trim()) {
    fieldErrors.value = {
      floor_name: [t('pages.settings.mapBuilder.floorNameRequired')]
    }
    return
  }

  saving.value = true
  formError.value = null
  fieldErrors.value = {}

  const payload: Record<string, unknown> = {
    floor_name: floorName.value.trim(),
    sort_order: sortOrder.value,
    scene: cloneFloorMapScene(editor.scene)
  }

  try {
    if (props.mapId) {
      await patch<ApiSiteMap>(`/api/site-maps/${props.mapId}`, payload)
      toast.add({
        title: t('pages.settings.mapBuilder.editSuccess'),
        color: 'success'
      })
    } else {
      await post<ApiSiteMap>(`/api/sites/${props.siteId}/maps`, payload)
      toast.add({
        title: t('pages.settings.mapBuilder.createSuccess'),
        color: 'success'
      })
    }

    editor.markClean()
    await goBack()
  } catch (err: unknown) {
    const fetchError = err as {
      data?: {
        message?: string
        errors?: Record<string, Array<string>>
      }
    }
    fieldErrors.value = fetchError.data?.errors ?? {}
    formError.value = fetchError.data?.message ?? t('pages.settings.mapBuilder.saveError')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.mapId) {
    return
  }

  deleting.value = true
  formError.value = null

  try {
    await del(`/api/site-maps/${props.mapId}`)
    toast.add({
      title: t('pages.settings.mapBuilder.deleteSuccess'),
      color: 'success'
    })
    await goBack()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    formError.value = fetchError.data?.message ?? t('pages.settings.mapBuilder.deleteError')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <div
      v-if="loading || unitsPending"
      class="flex flex-1 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="loadError"
      class="flex flex-1 flex-col items-center justify-center gap-3"
    >
      <p class="text-sm text-error">
        {{ loadError }}
      </p>
      <UButton
        :label="$t('pages.settings.mapBuilder.back')"
        color="neutral"
        variant="outline"
        @click="goBack"
      />
    </div>

    <template v-else>
      <div class="flex shrink-0 items-center gap-3 border-b border-default px-3 py-2">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :label="$t('pages.settings.mapBuilder.back')"
          @click="goBack"
        />

        <p class="text-sm font-medium text-highlighted">
          {{ isEditing
            ? $t('pages.settings.mapBuilder.editTitle')
            : $t('pages.settings.mapBuilder.createTitle') }}
        </p>

        <UFormField
          :label="$t('pages.settings.mapBuilder.floorName')"
          class="w-48"
          :error="fieldError('floor_name')"
        >
          <UInput
            v-model="floorName"
            size="sm"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.settings.mapBuilder.sortOrder')"
          class="w-24"
          :error="fieldError('sort_order')"
        >
          <UInput
            v-model.number="sortOrder"
            type="number"
            min="0"
            size="sm"
          />
        </UFormField>

        <div class="ml-auto flex items-center gap-2">
          <UButton
            icon="i-lucide-undo-2"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :disabled="!editor.canUndo"
            :aria-label="$t('pages.settings.mapBuilder.undo')"
            @click="editor.undo()"
          />
          <UButton
            icon="i-lucide-redo-2"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :disabled="!editor.canRedo"
            :aria-label="$t('pages.settings.mapBuilder.redo')"
            @click="editor.redo()"
          />
          <UButton
            v-if="isEditing"
            :label="$t('pages.settings.mapBuilder.delete')"
            color="error"
            variant="outline"
            size="sm"
            :loading="deleting"
            :disabled="saving"
            @click="remove"
          />
          <UButton
            :label="$t('pages.settings.mapBuilder.cancel')"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="saving || deleting"
            @click="goBack"
          />
          <UButton
            :label="$t('pages.settings.mapBuilder.save')"
            color="primary"
            size="sm"
            :loading="saving"
            :disabled="deleting"
            @click="save"
          />
        </div>
      </div>

      <p
        v-if="formError"
        class="border-b border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
      >
        {{ formError }}
      </p>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div class="shrink-0 overflow-x-auto border-b border-default lg:w-48 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <FacilityMapBuilderPalette
            :tool="editor.tool"
            @update:tool="editor.setTool"
          />
        </div>

        <FacilityMapBuilderCanvas
          class="min-h-0 min-w-0 flex-1"
          :scene="editor.scene"
          :selected-id="editor.selectedId"
          :tool="editor.tool"
          @select="editor.select"
          @place="onPlace"
          @gesture-start="editor.beginGesture"
          @geometry="editor.patchGeometry"
        />

        <div class="min-h-0 max-h-[42%] shrink-0 overflow-hidden border-t border-default lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l">
          <FacilityMapBuilderInspector
            :item="editor.selectedItem"
            :units="units"
            :assigned-unit-numbers="assignedSet"
            :match="match"
            @update="onInspectorUpdate"
            @place-unit="onPlaceUnit"
            @select-unit="onSelectUnit"
          />
        </div>
      </div>
    </template>
  </div>
</template>
