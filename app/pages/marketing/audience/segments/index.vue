<script setup lang="ts">
import type { Segment, SegmentPreview } from '~/types/segment'
import type { FilterGroup } from '~/types/filter'
import { isFilterGroup } from '~/types/filter'
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const toast = useToast()
const { can } = usePermissions()
const canManage = computed(() => can(Permission.MarketingManage))

const { segments, pending, error, fetchSegments, save, archive, preview } = useSegments('shared')
const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('contact')
const {
  workingFilter,
  addRootCondition,
  addRootGroup,
  addConditionToGroup,
  removeRootNode,
  removeNode,
  setRootOp,
  setWorking
} = useFilterTree('contact', { syncUrl: false })

const editorOpen = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const editing = ref<Segment | null>(null)
const name = ref('')
const description = ref('')
const previewPending = ref(false)
const previewResult = ref<SegmentPreview | null>(null)
const previewError = ref<string | null>(null)

const loadFailed = computed(() => !pending.value && error.value && segments.value.length === 0)
const hasConditions = computed(() => (workingFilter.value?.conditions.length ?? 0) > 0)
const showMatchToggle = computed(() => (workingFilter.value?.conditions.length ?? 0) >= 2)
const rootConditions = computed(() => workingFilter.value?.conditions ?? [])
const matchItems = computed(() => [
  { label: t('filters.matchAll'), value: 'and' },
  { label: t('filters.matchAny'), value: 'or' }
])

onMounted(() => {
  void fetchSegments()
})

function resetEditor() {
  editing.value = null
  name.value = ''
  description.value = ''
  saveError.value = null
  previewResult.value = null
  previewError.value = null
  setWorking(null)
}

function openCreate() {
  resetEditor()
  editorOpen.value = true
}

function openEdit(segment: Segment) {
  resetEditor()
  editing.value = segment
  name.value = segment.name
  description.value = segment.description ?? ''
  setWorking(segment.filter)
  editorOpen.value = true
}

function errorText(e: unknown): string {
  const err = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  if (err.data?.message === 'segment.invalid') {
    const field = (err.data as { data?: { field?: string } }).data?.field
    return t('pages.segments.invalid', { field: field ?? '' })
  }
  const errors = err.data?.errors
  if (errors) {
    const first = Object.values(errors)[0]?.[0]
    if (first) return first
  }
  return err.data?.message || t('pages.segments.saveError')
}

async function onSave() {
  if (!workingFilter.value || workingFilter.value.conditions.length === 0) {
    saveError.value = t('pages.segments.filterRequired')
    return
  }

  saving.value = true
  saveError.value = null
  try {
    await save({
      name: name.value.trim(),
      description: description.value.trim() === '' ? null : description.value.trim(),
      filter: workingFilter.value,
      is_shared: true
    }, editing.value?.id)
    editorOpen.value = false
    await fetchSegments()
    toast.add({ title: t('pages.segments.saved'), color: 'success' })
  } catch (e) {
    saveError.value = errorText(e)
  } finally {
    saving.value = false
  }
}

async function onPreview(filter: FilterGroup | null, segmentId?: number) {
  previewPending.value = true
  previewError.value = null
  previewResult.value = null
  try {
    previewResult.value = segmentId
      ? await preview({ segment_id: segmentId })
      : await preview({ filter: filter ?? undefined })
  } catch (e) {
    previewError.value = errorText(e)
  } finally {
    previewPending.value = false
  }
}

async function onArchive(segment: Segment) {
  try {
    await archive(segment.id)
    await fetchSegments()
    toast.add({ title: t('pages.segments.archived'), color: 'success' })
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

function sampleName(row: SegmentPreview['sample'][number]): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ')
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ t('pages.segments.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ t('pages.segments.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="canManage"
        icon="i-lucide-plus"
        :label="t('pages.segments.create')"
        @click="openCreate"
      />
    </div>

    <p
      v-if="pending"
      class="text-sm text-dimmed"
    >
      {{ t('pages.segments.loading') }}
    </p>

    <p
      v-else-if="loadFailed"
      class="text-sm text-error"
    >
      {{ t('pages.segments.loadError') }}
    </p>

    <p
      v-else-if="segments.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.segments.empty') }}
    </p>

    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="segment in segments"
        :key="segment.id"
        class="rounded-xl border border-default bg-default px-4 py-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-highlighted">
              {{ segment.name }}
            </h2>
            <p
              v-if="segment.description"
              class="mt-1 text-sm text-dimmed"
            >
              {{ segment.description }}
            </p>
            <p
              v-if="segment.invalid_field"
              class="mt-1 text-sm text-error"
            >
              {{ t('pages.segments.invalid', { field: segment.invalid_field }) }}
            </p>
            <p
              v-else
              class="mt-1 text-sm text-dimmed"
            >
              {{ t('pages.segments.count', { count: segment.count ?? 0 }) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              :label="t('pages.segments.preview')"
              @click="onPreview(null, segment.id)"
            />
            <UButton
              v-if="canManage"
              color="neutral"
              variant="outline"
              size="sm"
              :label="t('pages.segments.edit')"
              @click="openEdit(segment)"
            />
            <UButton
              v-if="canManage"
              color="neutral"
              variant="ghost"
              size="sm"
              :label="t('pages.segments.archive')"
              @click="onArchive(segment)"
            />
          </div>
        </div>
      </li>
    </ul>

    <div
      v-if="previewResult && !editorOpen"
      class="mt-6 rounded-xl border border-default p-4"
    >
      <p class="text-sm font-medium text-highlighted">
        {{ t('pages.segments.count', { count: previewResult.count }) }}
      </p>
      <ul class="mt-3 flex flex-col gap-1">
        <li
          v-for="row in previewResult.sample"
          :key="row.id"
          class="text-sm text-dimmed"
        >
          {{ sampleName(row) }}
          <span v-if="row.email"> · {{ row.email }}</span>
        </li>
      </ul>
    </div>
    <p
      v-else-if="previewError && !editorOpen"
      class="mt-6 text-sm text-error"
    >
      {{ previewError }}
    </p>

    <UModal
      v-model:open="editorOpen"
      :title="editing ? t('pages.segments.edit') : t('pages.segments.create')"
    >
      <template #body>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSave"
        >
          <UFormField :label="t('pages.segments.name')">
            <UInput
              v-model="name"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField :label="t('pages.segments.description')">
            <UTextarea
              v-model="description"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="filterSchemaPending"
            class="flex items-center justify-center py-8"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin text-dimmed"
            />
          </div>
          <div
            v-else
            class="flex flex-col gap-3"
          >
            <p
              v-if="!hasConditions"
              class="text-sm text-dimmed"
            >
              {{ t('filters.emptyHint') }}
            </p>
            <div
              v-if="showMatchToggle && workingFilter"
              class="flex items-center gap-2 text-sm"
            >
              <span>{{ t('filters.match') }}</span>
              <USelect
                :model-value="workingFilter.op"
                :items="matchItems"
                value-key="value"
                class="w-28"
                size="sm"
                @update:model-value="(value) => setRootOp(value as 'and' | 'or')"
              />
              <span class="text-dimmed">{{ t('filters.ofTheFollowing') }}</span>
            </div>
            <template
              v-for="(node, index) in rootConditions"
              :key="index"
            >
              <FiltersFilterConditionRow
                v-if="!isFilterGroup(node) && workingFilter"
                v-model:condition="workingFilter.conditions[index]"
                :fields="filterFields"
                @remove="removeRootNode(index)"
              />
              <FiltersFilterGroupCard
                v-else-if="isFilterGroup(node)"
                v-model:group="workingFilter!.conditions[index]"
                :fields="filterFields"
                @remove="removeRootNode(index)"
                @add-condition="addConditionToGroup(node)"
                @remove-condition="(conditionIndex) => removeNode(node, conditionIndex)"
              />
            </template>
            <div class="flex flex-wrap gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-plus"
                :label="t('filters.addFilter')"
                @click="addRootCondition"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-folder-plus"
                :label="t('filters.addGroup')"
                @click="addRootGroup"
              />
            </div>
          </div>

          <p
            v-if="saveError"
            class="text-sm text-error"
          >
            {{ saveError }}
          </p>
          <p
            v-if="previewError"
            class="text-sm text-error"
          >
            {{ previewError }}
          </p>
          <p
            v-if="previewResult"
            class="text-sm text-dimmed"
          >
            {{ t('pages.segments.count', { count: previewResult.count }) }}
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              type="button"
              :label="t('pages.segments.preview')"
              :disabled="!hasConditions"
              :loading="previewPending"
              @click="onPreview(workingFilter)"
            />
            <UButton
              type="submit"
              :label="t('pages.segments.save')"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </UModal>
  </UContainer>
</template>
