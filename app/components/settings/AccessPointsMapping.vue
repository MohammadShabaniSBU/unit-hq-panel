<script setup lang="ts">
import type { ApiAccessPointMappingRow, ApiAccessPointSuggestion } from '~/types/access'
import type { ApiOption } from '~/types/facility'

const { t } = useI18n()
const toast = useToast()

const {
  rows,
  pending,
  error,
  refresh,
  submitting,
  actionError,
  assign,
  archive,
  suggest,
  bulkAssign
} = useAccessPoints()

const { items: siteItems } = useOptions('/api/sites/options')
const { get } = useApi()

const draftSite = reactive<Record<string, number | undefined>>({})
const draftType = reactive<Record<string, string>>({})
const draftUnit = reactive<Record<string, number | undefined>>({})
const unitOptions = ref<Record<string, Array<ApiOption>>>({})

const suggestOpen = ref(false)
const suggestions = ref<Array<ApiAccessPointSuggestion>>([])

const pointTypeItems = computed(() => [
  { label: t('settings.access.points.types.unit_door'), value: 'unit_door' },
  { label: t('settings.access.points.types.gate'), value: 'gate' },
  { label: t('settings.access.points.types.zone'), value: 'zone' }
])

function rowKey(row: ApiAccessPointMappingRow): string {
  return `${row.status}:${row.provider_point_id}`
}

function statusColor(status: string) {
  if (status === 'assigned') {
    return 'success' as const
  }
  if (status === 'vanished') {
    return 'warning' as const
  }
  return 'neutral' as const
}

async function loadUnitsForSite(siteId: number, key: string) {
  const response = await get<Array<ApiOption>>('/api/units/options', { site_id: siteId })
  unitOptions.value[key] = response.data ?? []
}

async function onSiteChange(row: ApiAccessPointMappingRow, siteId: number | undefined) {
  const key = rowKey(row)
  draftSite[key] = siteId
  draftUnit[key] = undefined
  if (siteId != null) {
    await loadUnitsForSite(siteId, key)
  } else {
    unitOptions.value[key] = []
  }
}

async function onAssign(row: ApiAccessPointMappingRow) {
  const key = rowKey(row)
  const siteId = draftSite[key]
  const pointType = draftType[key] || row.point_type || row.kind_hint || 'gate'
  if (siteId == null) {
    toast.add({ title: t('settings.access.points.siteRequired'), color: 'error' })
    return
  }

  const ok = await assign({
    provider_point_id: row.provider_point_id,
    site_id: siteId,
    unit_id: pointType === 'unit_door' ? (draftUnit[key] ?? null) : null,
    point_type: pointType,
    label: row.label
  })

  if (ok) {
    toast.add({ title: t('settings.access.points.assignSuccess'), color: 'success' })
  }
}

async function onArchive(row: ApiAccessPointMappingRow) {
  if (row.id == null) {
    return
  }
  const ok = await archive(row.id)
  if (ok) {
    toast.add({ title: t('settings.access.points.archiveSuccess'), color: 'success' })
  }
}

async function onSuggest() {
  suggestions.value = await suggest()
  suggestOpen.value = true
}

async function onConfirmSuggestions() {
  const count = await bulkAssign(suggestions.value.map(s => ({
    provider_point_id: s.provider_point_id,
    site_id: s.suggested_site_id,
    unit_id: s.suggested_unit_id,
    point_type: String(s.suggested_point_type)
  })))
  if (count != null) {
    suggestOpen.value = false
    toast.add({
      title: t('settings.access.points.bulkSuccess', { count }),
      color: 'success'
    })
  }
}

watch(rows, async (list) => {
  for (const row of list) {
    const key = rowKey(row)
    draftType[key] ??= String(row.point_type ?? row.kind_hint ?? 'gate')
    if (row.site_id != null) {
      draftSite[key] ??= row.site_id
      if (!unitOptions.value[key]) {
        await loadUnitsForSite(row.site_id, key)
      }
    }
    if (row.unit_id != null) {
      draftUnit[key] ??= row.unit_id
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="mt-6 rounded-lg border border-default p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-sm font-medium text-highlighted">
          {{ t('settings.access.points.title') }}
        </p>
        <p class="mt-1 text-xs text-dimmed">
          {{ t('settings.access.points.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          :label="t('settings.access.points.bulkSuggest')"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="submitting"
          @click="onSuggest"
        />
        <UButton
          :label="t('settings.access.points.refresh')"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="pending"
          @click="refresh()"
        />
      </div>
    </div>

    <p
      v-if="actionError"
      class="mt-2 text-sm text-error"
    >
      {{ actionError }}
    </p>

    <div
      v-if="pending"
      class="flex items-center justify-center py-10"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <SettingsLoadError
      v-else-if="error"
      :message="t('pages.settings.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="mt-4 space-y-3"
    >
      <div
        v-if="rows.length === 0"
        class="rounded-md bg-muted px-3 py-4 text-sm text-dimmed"
      >
        {{ t('settings.access.points.empty') }}
      </div>

      <div
        v-for="row in rows"
        :key="rowKey(row)"
        class="rounded-md border border-default p-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-highlighted">
              {{ row.label }}
            </p>
            <p class="mt-0.5 text-xs text-dimmed">
              {{ row.provider_point_id }}
              <span v-if="row.kind_hint"> · {{ row.kind_hint }}</span>
            </p>
          </div>
          <UBadge
            :color="statusColor(row.status)"
            variant="subtle"
            :label="t(`settings.access.points.status.${row.status}`)"
          />
        </div>

        <div
          v-if="row.status === 'unassigned'"
          class="mt-3 grid gap-2 sm:grid-cols-3"
        >
          <UFormField :label="t('settings.access.points.site')">
            <USelect
              :model-value="draftSite[rowKey(row)]"
              :items="siteItems"
              value-key="value"
              label-key="label"
              class="w-full"
              @update:model-value="(v: number) => onSiteChange(row, v)"
            />
          </UFormField>
          <UFormField :label="t('settings.access.points.type')">
            <USelect
              v-model="draftType[rowKey(row)]"
              :items="pointTypeItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            v-if="(draftType[rowKey(row)] || row.kind_hint) === 'unit_door'"
            :label="t('settings.access.points.unit')"
          >
            <USelect
              v-model="draftUnit[rowKey(row)]"
              :items="unitOptions[rowKey(row)] ?? []"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <div
          v-else
          class="mt-2 text-xs text-dimmed"
        >
          <span v-if="row.site_name">{{ row.site_name }}</span>
          <span v-if="row.unit_number"> · {{ row.unit_number }}</span>
          <span v-if="row.point_type"> · {{ t(`settings.access.points.types.${row.point_type}`, row.point_type) }}</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            v-if="row.status === 'unassigned'"
            :label="t('settings.access.points.assign')"
            size="sm"
            color="primary"
            :loading="submitting"
            @click="onAssign(row)"
          />
          <UButton
            v-if="row.status === 'assigned' || row.status === 'vanished'"
            :label="t('settings.access.points.archive')"
            size="sm"
            color="neutral"
            variant="outline"
            :loading="submitting"
            @click="onArchive(row)"
          />
        </div>
      </div>
    </div>

    <UModal v-model:open="suggestOpen">
      <template #content>
        <div class="p-4">
          <p class="text-sm font-medium text-highlighted">
            {{ t('settings.access.points.bulkTitle') }}
          </p>
          <p class="mt-1 text-xs text-dimmed">
            {{ t('settings.access.points.bulkSubtitle', { count: suggestions.length }) }}
          </p>
          <ul class="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            <li
              v-for="s in suggestions"
              :key="s.provider_point_id"
              class="rounded-md bg-muted px-3 py-2"
            >
              {{ s.label }} → unit #{{ s.suggested_unit_id }}
              <span class="text-xs text-dimmed">({{ s.confidence }})</span>
            </li>
          </ul>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              :label="t('settings.access.points.cancel')"
              color="neutral"
              variant="ghost"
              @click="suggestOpen = false"
            />
            <UButton
              :label="t('settings.access.points.confirmAll')"
              color="primary"
              :disabled="suggestions.length === 0"
              :loading="submitting"
              @click="onConfirmSuggestions"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
