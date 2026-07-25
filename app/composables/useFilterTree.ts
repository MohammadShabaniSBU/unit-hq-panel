import type { FilterCondition, FilterEntityType, FilterGroup } from '~/types/filter'
import {
  countFilterConditions,
  createEmptyCondition,
  createEmptyGroup,
  decodeFilterParam,
  encodeFilterParam,
  isFilterGroup
} from '~/types/filter'

/** Deep-clone plain filter JSON; works with Vue reactive proxies (structuredClone does not). */
function cloneFilter(filter: FilterGroup): FilterGroup {
  return JSON.parse(JSON.stringify(filter)) as FilterGroup
}

export function useFilterTree(_entityType: MaybeRefOrGetter<FilterEntityType>) {
  const route = useRoute()
  const router = useRouter()

  const initialFilter = decodeFilterParam(typeof route.query.f === 'string' ? route.query.f : null)

  const open = ref(false)
  const appliedFilter = ref<FilterGroup | null>(initialFilter)
  const workingFilter = ref<FilterGroup | null>(initialFilter ? cloneFilter(initialFilter) : null)

  const appliedCount = computed(() => countFilterConditions(appliedFilter.value))
  const workingCount = computed(() => countFilterConditions(workingFilter.value))

  function syncUrl(filter: FilterGroup | null) {
    const encoded = encodeFilterParam(filter)
    const nextQuery = { ...route.query }

    if (encoded) {
      nextQuery.f = encoded
    } else {
      delete nextQuery.f
    }

    router.replace({ query: nextQuery })
  }

  function hydrateFromUrl() {
    const fromUrl = decodeFilterParam(typeof route.query.f === 'string' ? route.query.f : null)
    appliedFilter.value = fromUrl
    workingFilter.value = fromUrl ? cloneFilter(fromUrl) : null
  }

  function openSlideover() {
    workingFilter.value = appliedFilter.value
      ? cloneFilter(appliedFilter.value)
      : null
    open.value = true
  }

  function cancel() {
    workingFilter.value = appliedFilter.value
      ? cloneFilter(appliedFilter.value)
      : null
    open.value = false
  }

  function apply() {
    const next = workingFilter.value && workingFilter.value.conditions.length > 0
      ? cloneFilter(workingFilter.value)
      : null

    appliedFilter.value = next
    syncUrl(next)
    open.value = false
  }

  function clearAll() {
    workingFilter.value = null
    appliedFilter.value = null
    syncUrl(null)
    open.value = false
  }

  function ensureWorkingRoot(): FilterGroup {
    if (!workingFilter.value) {
      workingFilter.value = createEmptyGroup('and')
    }

    return workingFilter.value
  }

  function addRootCondition() {
    const root = ensureWorkingRoot()
    root.conditions.push(createEmptyCondition())
  }

  function addRootGroup() {
    const root = ensureWorkingRoot()
    const group = createEmptyGroup('or')
    group.conditions.push(createEmptyCondition())
    root.conditions.push(group)
  }

  function addConditionToGroup(group: FilterGroup) {
    group.conditions.push(createEmptyCondition())
  }

  function removeNode(parent: FilterGroup, index: number) {
    parent.conditions.splice(index, 1)

    if (workingFilter.value && workingFilter.value.conditions.length === 0) {
      workingFilter.value = null
    }
  }

  function removeRootNode(index: number) {
    if (!workingFilter.value) {
      return
    }

    removeNode(workingFilter.value, index)
  }

  function setRootOp(op: 'and' | 'or') {
    const root = ensureWorkingRoot()
    root.op = op
  }

  return {
    open,
    appliedFilter,
    workingFilter,
    appliedCount,
    workingCount,
    openSlideover,
    cancel,
    apply,
    clearAll,
    addRootCondition,
    addRootGroup,
    addConditionToGroup,
    removeRootNode,
    removeNode,
    setRootOp,
    isFilterGroup,
    hydrateFromUrl
  }
}

export type { FilterCondition, FilterGroup }
