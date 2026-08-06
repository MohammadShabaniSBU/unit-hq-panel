<script setup lang="ts">
import { resolveNativeReport } from '~/insights/registry'
import { resolveInsightLabel } from '~/types/insights'

const route = useRoute()
const { t } = useI18n()
const {
  ensureLoaded,
  fetch,
  byKey,
  pending,
  loaded
} = useInsightRegistry()

const key = computed(() => String(route.params.key ?? ''))

onMounted(() => {
  void ensureLoaded()
})

watch(key, () => {
  if (!loaded.value && !pending.value) {
    void fetch()
  }
})

const report = computed(() => {
  if (!key.value) {
    return null
  }
  return byKey(key.value)
})

const resolving = computed(() => !loaded.value && pending.value)

const notFound = computed(() =>
  loaded.value && !pending.value && report.value == null
)

const nativeComponent = computed(() => {
  if (!report.value || report.value.source !== 'native') {
    return null
  }
  return resolveNativeReport(report.value.native_key)
})

const nativeUnavailable = computed(() =>
  report.value?.source === 'native' && nativeComponent.value == null
)

const pageTitle = computed(() => {
  if (!report.value) {
    return t('insights.states.not_found')
  }
  return resolveInsightLabel(report.value, t)
})

useHead({
  title: pageTitle
})
</script>

<template>
  <component
    :is="nativeComponent"
    v-if="report?.source === 'native' && nativeComponent"
    :name="report.native_key ?? key"
  />

  <UContainer
    v-else
    class="py-8"
  >
    <div
      v-if="resolving"
      class="text-muted py-12 text-center text-sm"
    >
      {{ $t('common.loading') }}
    </div>

    <div
      v-else-if="notFound"
      class="flex flex-col items-start gap-4 py-12"
    >
      <p class="text-highlighted text-lg font-medium">
        {{ $t('insights.states.not_found') }}
      </p>
      <p class="text-muted text-sm">
        {{ $t('insights.states.notFoundHint') }}
      </p>
      <UButton
        to="/insights"
        color="primary"
        variant="soft"
        icon="i-lucide-arrow-left"
      >
        {{ $t('insights.states.backToInsights') }}
      </UButton>
    </div>

    <div
      v-else-if="nativeUnavailable"
      class="flex flex-col items-start gap-4 py-12"
    >
      <p class="text-highlighted text-lg font-medium">
        {{ $t('insights.states.versionSkew') }}
      </p>
      <p class="text-muted text-sm">
        {{ $t('insights.states.versionSkewHint') }}
      </p>
      <UButton
        to="/insights"
        color="primary"
        variant="soft"
        icon="i-lucide-arrow-left"
      >
        {{ $t('insights.states.backToInsights') }}
      </UButton>
    </div>

    <InsightsInsightEmbed
      v-else-if="report?.source === 'embedded'"
      :report="report"
    />
  </UContainer>
</template>
