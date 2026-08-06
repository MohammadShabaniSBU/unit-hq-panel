<script setup lang="ts">
import type {
  AnalyticsAccount,
  DiscoveredParam,
  DynamicParamKey,
  InsightParamDraft,
  InsightReport,
  InsightReportSource,
  InsightResourceKind,
  InsightSiteScopeMode,
  InsightVisibility
} from '~/types/insights'
import { NATIVE_REPORT_KEYS } from '~/types/insights'
import { Permission } from '~/types/permissions'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  report: InsightReport | null
  accounts: Array<AnalyticsAccount>
  existingReports: Array<InsightReport>
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { create, update, submitting, actionError, lastSaveError } = useInsightReports()
const { can } = usePermissions()
const canCredentials = computed(() => can(Permission.CredentialManage))
const { providers } = useAnalyticsProviders({ enabled: canCredentials })
const {
  resources,
  mode: discoveryMode,
  pending: resourcesPending,
  paramsPending,
  fetchResources,
  fetchParams,
  reset: resetDiscovery
} = useAnalyticsResources()

const isEditing = computed(() => props.report != null)
const isSystem = computed(() => props.report?.is_system === true)

const title = computed(() =>
  isEditing.value
    ? t('settings.insights.reports.editTitle')
    : t('settings.insights.reports.createTitle')
)

const key = ref('')
const source = ref<InsightReportSource>('embedded')
const nativeKey = ref<string>('')
const accountId = ref<number | undefined>(undefined)
const resourceKind = ref<InsightResourceKind | string>('dashboard')
const resourceRef = ref('')
const labelEn = ref('')
const labelEs = ref('')
const labelFr = ref('')
const descriptionEn = ref('')
const descriptionEs = ref('')
const descriptionFr = ref('')
const icon = ref('')
const section = ref('')
const visibility = ref<InsightVisibility>('all')
const siteScopeMode = ref<InsightSiteScopeMode>('inherit')
const optionBordered = ref(true)
const optionTitled = ref(true)
const optionDownloads = ref(true)
const paramDrafts = ref<Array<InsightParamDraft>>([])
const clientError = ref<string | null>(null)

const unusedNativeKeys = computed(() => {
  const used = new Set(
    props.existingReports
      .filter(row => row.source === 'native' && row.native_key)
      .map(row => row.native_key as string)
  )
  if (props.report?.native_key) {
    used.delete(props.report.native_key)
  }
  return NATIVE_REPORT_KEYS.filter(k => !used.has(k))
})

const nativeKeyItems = computed((): Array<{ value: string, label: string }> =>
  unusedNativeKeys.value.map(k => ({
    value: k,
    label: k
  }))
)

const sourceItems = computed(() => [
  { value: 'native' as const, label: t('settings.insights.reports.sourceNative') },
  { value: 'embedded' as const, label: t('settings.insights.reports.sourceEmbedded') }
])

const accountItems = computed(() =>
  props.accounts.map(account => ({
    value: account.id,
    label: `${account.display_name} (${account.provider})`
  }))
)

const selectedAccount = computed(() =>
  props.accounts.find(account => account.id === accountId.value) ?? null
)

const selectedProvider = computed(() => {
  if (!selectedAccount.value) {
    return null
  }
  return providers.value.find(row => row.key === selectedAccount.value!.provider) ?? null
})

const resourceKindItems = computed(() => {
  const kinds = selectedProvider.value?.resource_kinds?.length
    ? selectedProvider.value.resource_kinds
    : ['dashboard', 'question']

  return kinds.map(kind => ({
    value: kind,
    label: kind === 'question'
      ? t('settings.insights.reports.kindQuestion')
      : kind === 'dashboard'
        ? t('settings.insights.reports.kindDashboard')
        : kind
  }))
})

const resourceItems = computed(() =>
  resources.value.map(resource => ({
    value: resource.ref,
    label: resource.enabled_for_embedding
      ? resource.name
      : `${resource.name} (${t('settings.insights.reports.resourceUnpublished')})`
  }))
)

const visibilityItems = computed(() => [
  { value: 'all' as const, label: t('settings.insights.reports.visibilityAll') },
  { value: 'company_only' as const, label: t('settings.insights.reports.visibilityCompanyOnly') },
  { value: 'site_staff' as const, label: t('settings.insights.reports.visibilitySiteStaff') }
])

const scopeItems = computed(() => [
  { value: 'inherit' as const, label: t('settings.insights.reports.scopeInherit') },
  { value: 'ignore' as const, label: t('settings.insights.reports.scopeIgnore') }
])

const showResourceSection = computed(() => source.value === 'embedded' && !isSystem.value)
const showParamsSection = computed(() => source.value === 'embedded' && !isSystem.value)
const manualResourceEntry = computed(() =>
  discoveryMode.value === 'manual'
  || selectedProvider.value?.lists_resources === false
)

watch([open, () => props.report], async () => {
  if (!open.value) {
    return
  }

  clientError.value = null
  resetDiscovery()

  if (props.report) {
    key.value = props.report.key
    source.value = props.report.source
    nativeKey.value = props.report.native_key ?? ''
    accountId.value = props.report.analytics_account_id ?? undefined
    resourceKind.value = props.report.resource_kind ?? 'dashboard'
    resourceRef.value = props.report.resource_ref ?? ''
    labelEn.value = props.report.labels?.en ?? ''
    labelEs.value = props.report.labels?.es ?? ''
    labelFr.value = props.report.labels?.fr ?? ''
    descriptionEn.value = props.report.description?.en ?? ''
    descriptionEs.value = props.report.description?.es ?? ''
    descriptionFr.value = props.report.description?.fr ?? ''
    icon.value = props.report.icon ?? ''
    section.value = props.report.section ?? ''
    visibility.value = props.report.visibility
    siteScopeMode.value = props.report.site_scope_mode
    optionBordered.value = Boolean(props.report.options?.bordered ?? true)
    optionTitled.value = Boolean(props.report.options?.titled ?? true)
    optionDownloads.value = Boolean(props.report.options?.downloads ?? true)
    paramDrafts.value = (props.report.params ?? []).map((param, index) => ({
      name: param.name,
      provider_type: 'string',
      embedding_mode: 'locked',
      is_required: param.is_required,
      value_source: param.value_source,
      static_value: param.static_value == null ? '' : String(param.static_value),
      dynamic_key: (param.dynamic_key as DynamicParamKey | null) ?? '',
      binding: param.binding,
      sort_order: param.sort_order ?? index,
      error: null
    }))

    if (props.report.source === 'embedded' && props.report.analytics_account_id) {
      await loadDiscovery(false)
      await loadParamsForCurrentResource()
    }
  } else {
    key.value = ''
    source.value = unusedNativeKeys.value.length > 0 ? 'native' : 'embedded'
    nativeKey.value = unusedNativeKeys.value[0] ?? ''
    accountId.value = props.accounts.find(a => a.is_default)?.id
      ?? props.accounts[0]?.id
    resourceKind.value = 'dashboard'
    resourceRef.value = ''
    labelEn.value = ''
    labelEs.value = ''
    labelFr.value = ''
    descriptionEn.value = ''
    descriptionEs.value = ''
    descriptionFr.value = ''
    icon.value = ''
    section.value = ''
    visibility.value = 'all'
    siteScopeMode.value = 'inherit'
    optionBordered.value = true
    optionTitled.value = true
    optionDownloads.value = true
    paramDrafts.value = []

    if (source.value === 'embedded' && accountId.value != null) {
      await loadDiscovery(false)
    }
  }
})

watch([accountId, resourceKind, source], async () => {
  if (!open.value || source.value !== 'embedded' || isSystem.value || accountId.value == null) {
    return
  }
  resourceRef.value = ''
  paramDrafts.value = []
  await loadDiscovery(false)
})

watch(resourceRef, async () => {
  if (!open.value || source.value !== 'embedded' || isSystem.value) {
    return
  }
  await loadParamsForCurrentResource()
})

async function loadDiscovery(refresh: boolean) {
  if (accountId.value == null) {
    return
  }
  await fetchResources(accountId.value, resourceKind.value, refresh)
}

async function loadParamsForCurrentResource() {
  if (accountId.value == null || !resourceRef.value) {
    return
  }

  if (manualResourceEntry.value && !selectedProvider.value?.describes_params) {
    return
  }

  const discovered = await fetchParams(accountId.value, resourceKind.value, resourceRef.value)
  mergeDiscoveredParams(discovered)
}

function mergeDiscoveredParams(discovered: Array<DiscoveredParam>) {
  if (discovered.length === 0) {
    return
  }

  const existingByName = new Map(paramDrafts.value.map(row => [row.name, row]))
  paramDrafts.value = discovered.map((param, index) => {
    const existing = existingByName.get(param.slug)
    if (existing) {
      return {
        ...existing,
        provider_type: param.type,
        embedding_mode: param.embedding_mode,
        is_required: param.required,
        sort_order: index,
        error: null
      }
    }

    return {
      name: param.slug,
      provider_type: param.type,
      embedding_mode: param.embedding_mode,
      is_required: param.required,
      value_source: 'static' as const,
      static_value: '',
      dynamic_key: '' as const,
      binding: param.embedding_mode === 'enabled' ? 'default' as const : 'locked' as const,
      sort_order: index,
      error: null
    }
  })
}

function applyValidationErrors() {
  const detail = lastSaveError.value?.validationDetail
  if (!detail?.mismatches?.length) {
    if (detail?.message) {
      const slug = typeof detail.mismatches?.[0]?.slug === 'string'
        ? detail.mismatches[0].slug
        : null
      if (!slug && paramDrafts.value.length > 0) {
        // attach generic message to first row if no mismatches array parse worked
      }
    }
  }

  for (const draft of paramDrafts.value) {
    draft.error = null
  }

  const mismatches = detail?.mismatches ?? []
  for (const mismatch of mismatches) {
    const row = paramDrafts.value.find(draft => draft.name === mismatch.slug)
    if (row && mismatch.instruction) {
      row.error = String(mismatch.instruction)
    }
  }

  if (mismatches.length === 0 && detail?.message && paramDrafts.value.length > 0) {
    // Try to find slug mentioned in message
    const mentioned = paramDrafts.value.find(draft =>
      String(detail.message).includes(draft.name)
    )
    if (mentioned) {
      mentioned.error = String(detail.message)
    }
  }
}

function buildLabels(): Record<string, string> | null {
  const labels: Record<string, string> = {}
  if (labelEn.value.trim()) {
    labels.en = labelEn.value.trim()
  }
  if (labelEs.value.trim()) {
    labels.es = labelEs.value.trim()
  }
  if (labelFr.value.trim()) {
    labels.fr = labelFr.value.trim()
  }
  return Object.keys(labels).length > 0 ? labels : null
}

function buildDescription(): Record<string, string> | null {
  const description: Record<string, string> = {}
  if (descriptionEn.value.trim()) {
    description.en = descriptionEn.value.trim()
  }
  if (descriptionEs.value.trim()) {
    description.es = descriptionEs.value.trim()
  }
  if (descriptionFr.value.trim()) {
    description.fr = descriptionFr.value.trim()
  }
  return Object.keys(description).length > 0 ? description : null
}

function validateClient(): boolean {
  clientError.value = null

  if (!key.value.trim()) {
    clientError.value = t('settings.insights.reports.key')
    return false
  }

  if (source.value === 'native' && !isSystem.value && !nativeKey.value) {
    clientError.value = t('settings.insights.reports.nativeKeyEmpty')
    return false
  }

  if (source.value === 'embedded' && !isSystem.value) {
    if (accountId.value == null || !resourceKind.value || !resourceRef.value) {
      clientError.value = t('settings.insights.reports.resourceDiscoveryError')
      return false
    }

    for (const draft of paramDrafts.value) {
      draft.error = null
      if (draft.is_required) {
        if (draft.value_source === 'static' && !draft.static_value.trim()) {
          draft.error = t('settings.insights.reports.paramsRequired')
          clientError.value = t('settings.insights.reports.paramsRequired')
          return false
        }
        if (draft.value_source === 'dynamic' && !draft.dynamic_key) {
          draft.error = t('settings.insights.reports.paramsRequired')
          clientError.value = t('settings.insights.reports.paramsRequired')
          return false
        }
      }
    }
  }

  if (source.value === 'embedded' && !isSystem.value && !isEditing.value) {
    if (!labelEn.value.trim() && !labelEs.value.trim() && !labelFr.value.trim()) {
      clientError.value = t('settings.insights.reports.labelEn')
      return false
    }
  }

  return true
}

async function onSubmit() {
  if (!validateClient()) {
    return
  }

  const labels = buildLabels()
  const description = buildDescription()
  const options = {
    bordered: optionBordered.value,
    titled: optionTitled.value,
    downloads: optionDownloads.value
  }

  const params = paramDrafts.value.map((draft, index) => ({
    name: draft.name,
    value_source: draft.value_source,
    static_value: draft.value_source === 'static' ? draft.static_value : null,
    dynamic_key: draft.value_source === 'dynamic' ? draft.dynamic_key || null : null,
    binding: draft.value_source === 'dynamic' ? 'locked' as const : draft.binding,
    is_required: draft.is_required,
    sort_order: index
  }))

  let saved: InsightReport | null = null

  if (props.report) {
    const payload = isSystem.value
      ? {
          key: key.value,
          labels,
          description,
          icon: icon.value || null,
          section: section.value || null,
          visibility: visibility.value,
          site_scope_mode: siteScopeMode.value,
          options
        }
      : {
          key: key.value,
          source: source.value,
          native_key: source.value === 'native' ? nativeKey.value : null,
          analytics_account_id: source.value === 'embedded' ? (accountId.value ?? null) : null,
          resource_kind: source.value === 'embedded' ? resourceKind.value : null,
          resource_ref: source.value === 'embedded' ? resourceRef.value : null,
          labels,
          description,
          icon: icon.value || null,
          section: section.value || null,
          visibility: visibility.value,
          site_scope_mode: siteScopeMode.value,
          options,
          params: source.value === 'embedded' ? params : []
        }

    saved = await update(props.report.id, payload)
  } else {
    saved = await create({
      key: key.value,
      source: source.value,
      native_key: source.value === 'native' ? nativeKey.value : null,
      analytics_account_id: source.value === 'embedded' ? (accountId.value ?? null) : null,
      resource_kind: source.value === 'embedded' ? resourceKind.value : null,
      resource_ref: source.value === 'embedded' ? resourceRef.value : null,
      labels,
      description,
      icon: icon.value || null,
      section: section.value || null,
      visibility: visibility.value,
      site_scope_mode: siteScopeMode.value,
      options,
      params: source.value === 'embedded' ? params : []
    })
  }

  if (!saved) {
    applyValidationErrors()
    return
  }

  if (saved.validation_warning || saved.validation_status === 'unreachable') {
    toast.add({
      title: t('settings.insights.reports.saveWarningUnreachable'),
      color: 'warning'
    })
  } else {
    toast.add({ title: t('settings.insights.reports.saveSuccess'), color: 'success' })
  }

  open.value = false
  emit('saved')
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="title"
  >
    <template #body>
      <form
        class="flex flex-col gap-6"
        @submit.prevent="onSubmit"
      >
        <section class="space-y-3">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('settings.insights.reports.sectionSource') }}
          </p>

          <UFormField
            :label="t('settings.insights.reports.key')"
            :hint="t('settings.insights.reports.keyHelp')"
            required
          >
            <UInput
              v-model="key"
              class="w-full"
              :disabled="isSystem"
            />
          </UFormField>

          <UFormField
            v-if="!isSystem"
            :label="t('settings.insights.reports.source')"
            required
          >
            <USelect
              v-model="source"
              :items="sourceItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="source === 'native' && !isSystem"
            :label="t('settings.insights.reports.nativeKey')"
            required
          >
            <USelect
              v-if="nativeKeyItems.length > 0"
              :model-value="nativeKey || undefined"
              :items="nativeKeyItems"
              value-key="value"
              class="w-full"
              @update:model-value="nativeKey = String($event ?? '')"
            />
            <p
              v-else
              class="text-xs text-dimmed"
            >
              {{ t('settings.insights.reports.nativeKeyEmpty') }}
            </p>
          </UFormField>

          <UFormField
            v-if="source === 'embedded' && !isSystem"
            :label="t('settings.insights.reports.account')"
            required
          >
            <USelect
              :model-value="accountId"
              :items="accountItems"
              value-key="value"
              class="w-full"
              @update:model-value="accountId = typeof $event === 'number' ? $event : undefined"
            />
          </UFormField>
        </section>

        <section
          v-if="showResourceSection"
          class="space-y-3"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('settings.insights.reports.sectionResource') }}
          </p>

          <UFormField
            :label="t('settings.insights.reports.resourceKind')"
            required
          >
            <USelect
              v-model="resourceKind"
              :items="resourceKindItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <p
            v-if="manualResourceEntry"
            class="text-xs text-dimmed"
          >
            {{ t('settings.insights.reports.resourceManualHelp') }}
          </p>

          <UFormField
            v-if="manualResourceEntry"
            :label="t('settings.insights.reports.resourceRef')"
            required
          >
            <UInput
              v-model="resourceRef"
              class="w-full"
            />
          </UFormField>

          <template v-else>
            <div
              v-if="resourcesPending"
              class="flex items-center gap-2 text-xs text-dimmed"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-4 animate-spin"
              />
              {{ t('settings.insights.reports.paramsLoading') }}
            </div>

            <p
              v-else-if="discoveryMode === 'empty'"
              class="text-xs text-dimmed"
            >
              {{ t('settings.insights.reports.resourceEmpty') }}
            </p>

            <p
              v-else-if="discoveryMode === 'error'"
              class="text-xs text-error"
            >
              {{ t('settings.insights.reports.resourceDiscoveryError') }}
            </p>

            <UFormField
              v-else
              :label="t('settings.insights.reports.resource')"
              required
            >
              <USelectMenu
                :model-value="resourceRef || undefined"
                :items="resourceItems"
                value-key="value"
                searchable
                class="w-full"
                @update:model-value="resourceRef = String($event ?? '')"
              />
            </UFormField>
          </template>
        </section>

        <section
          v-if="showParamsSection"
          class="space-y-3"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('settings.insights.reports.sectionParameters') }}
          </p>

          <div
            v-if="paramsPending"
            class="flex items-center gap-2 text-xs text-dimmed"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-4 animate-spin"
            />
            {{ t('settings.insights.reports.paramsLoading') }}
          </div>

          <p
            v-else-if="paramDrafts.length === 0"
            class="text-xs text-dimmed"
          >
            {{ t('settings.insights.reports.paramsEmpty') }}
          </p>

          <div
            v-else
            class="space-y-2"
          >
            <SettingsInsightsInsightParamRow
              v-for="(draft, index) in paramDrafts"
              :key="draft.name"
              v-model="paramDrafts[index]!"
            />
          </div>
        </section>

        <section class="space-y-3">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('settings.insights.reports.sectionPresentation') }}
          </p>

          <div class="grid gap-3 sm:grid-cols-3">
            <UFormField :label="t('settings.insights.reports.labelEn')">
              <UInput
                v-model="labelEn"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('settings.insights.reports.labelEs')">
              <UInput
                v-model="labelEs"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('settings.insights.reports.labelFr')">
              <UInput
                v-model="labelFr"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <UFormField :label="t('settings.insights.reports.descriptionEn')">
              <UInput
                v-model="descriptionEn"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('settings.insights.reports.descriptionEs')">
              <UInput
                v-model="descriptionEs"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('settings.insights.reports.descriptionFr')">
              <UInput
                v-model="descriptionFr"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField :label="t('settings.insights.reports.icon')">
              <UInput
                v-model="icon"
                class="w-full"
                placeholder="i-lucide-chart-column"
              />
            </UFormField>
            <UFormField :label="t('settings.insights.reports.section')">
              <UInput
                v-model="section"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex flex-wrap gap-4">
            <UCheckbox
              v-model="optionBordered"
              :label="t('settings.insights.reports.optionsBordered')"
            />
            <UCheckbox
              v-model="optionTitled"
              :label="t('settings.insights.reports.optionsTitled')"
            />
            <UCheckbox
              v-model="optionDownloads"
              :label="t('settings.insights.reports.optionsDownloads')"
            />
          </div>
        </section>

        <section class="space-y-3">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('settings.insights.reports.sectionScope') }}
          </p>
          <UFormField :label="t('settings.insights.reports.scopeMode')">
            <USelect
              v-model="siteScopeMode"
              :items="scopeItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <p class="text-xs text-dimmed">
            {{ siteScopeMode === 'inherit'
              ? t('settings.insights.reports.scopeInheritHelp')
              : t('settings.insights.reports.scopeIgnoreHelp') }}
          </p>
        </section>

        <section class="space-y-3">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('settings.insights.reports.sectionVisibility') }}
          </p>
          <UFormField
            :label="t('settings.insights.reports.visibility')"
            :hint="t('settings.insights.reports.visibilityHelp')"
          >
            <USelect
              v-model="visibility"
              :items="visibilityItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </section>

        <p
          v-if="clientError || actionError"
          class="text-sm text-error"
        >
          {{ clientError || actionError }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('settings.insights.reports.cancel')"
          @click="open = false"
        />
        <UButton
          color="primary"
          :label="t('settings.insights.reports.save')"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
