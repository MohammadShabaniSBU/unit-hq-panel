<script setup lang="ts">
import type { InsightEmbedReport } from '~/composables/useInsightEmbed'
import { resolveInsightLabel } from '~/types/insights'
import { loadIframeResizer } from '~/utils/loadIframeResizer'

const props = defineProps<{
  report: InsightEmbedReport
}>()

const { t } = useI18n()
const siteContext = useSiteContextStore()
const IFRAME_TIMEOUT_MS = 15_000
const IFRAME_MIN_HEIGHT_PX = 320
const PINNED_HEIGHT_PATTERN = /^\d+(\.\d+)?(px|vh|rem|em|%)$/

const {
  url,
  pending,
  errorKey,
  retry
} = useInsightEmbed(() => props.report.key, {
  siteScopeMode: () => props.report.site_scope_mode
})

function parsePinnedHeight(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return PINNED_HEIGHT_PATTERN.test(trimmed) ? trimmed : null
}

const title = computed(() => resolveInsightLabel(props.report, t))
const showValidationWarning = computed(() => props.report.validation_status !== 'valid')
const isIframeProvider = computed(() => props.report.provider === 'iframe')
const bordered = computed(() => props.report.options.bordered !== false)
const titled = computed(() => props.report.options.titled !== false)
const downloads = computed(() => props.report.options.downloads === true)
const pinnedHeight = computed(() => parsePinnedHeight(props.report.options.height))
const frameStyle = computed(() => pinnedHeight.value ? { height: pinnedHeight.value } : undefined)
const frameWrapStyle = computed(() => pinnedHeight.value ? { minHeight: pinnedHeight.value } : undefined)

const frameEl = useTemplateRef<HTMLIFrameElement>('frameEl')
const framePending = ref(true)
const frameTimedOut = ref(false)
let frameTimer: ReturnType<typeof setTimeout> | null = null
let loadGeneration = 0
let resizerFrame: HTMLIFrameElement | null = null
let resizerFailureLogged = false

function detachResizer() {
  resizerFrame?.iFrameResizer?.removeListeners()
  resizerFrame = null
}

function clearFrameTimer() {
  if (frameTimer != null) {
    clearTimeout(frameTimer)
    frameTimer = null
  }
}

function startFrameTimer() {
  clearFrameTimer()
  framePending.value = true
  frameTimedOut.value = false
  frameTimer = setTimeout(() => {
    if (framePending.value) {
      frameTimedOut.value = true
      framePending.value = false
    }
  }, IFRAME_TIMEOUT_MS)
}

watch(url, (next) => {
  loadGeneration += 1
  detachResizer()
  if (!next) {
    clearFrameTimer()
    framePending.value = false
    frameTimedOut.value = false
    return
  }
  startFrameTimer()
}, { immediate: true })

async function onFrameLoad() {
  clearFrameTimer()
  framePending.value = false
  frameTimedOut.value = false

  const generation = ++loadGeneration
  detachResizer()

  if (pinnedHeight.value || props.report.provider !== 'metabase') {
    return
  }

  const embedUrl = url.value
  if (!embedUrl) {
    return
  }

  let origin: string
  try {
    origin = new URL(embedUrl).origin
  } catch {
    return
  }

  try {
    await loadIframeResizer(origin)
    if (generation !== loadGeneration) {
      return
    }
    const frame = frameEl.value
    if (!frame || typeof window.iFrameResize !== 'function') {
      return
    }
    window.iFrameResize({
      checkOrigin: [origin],
      heightCalculationMethod: 'lowestElement',
      sizeWidth: false,
      log: import.meta.dev,
      minHeight: IFRAME_MIN_HEIGHT_PX,
      onClose: () => false
    }, frame)
    resizerFrame = frame
  } catch (err: unknown) {
    if (resizerFailureLogged || !import.meta.dev) {
      return
    }
    resizerFailureLogged = true
    console.warn('[insights] iframe-resizer init failed', err)
  }
}

async function onRetry() {
  frameTimedOut.value = false
  await retry()
}

onBeforeUnmount(() => {
  loadGeneration += 1
  detachResizer()
  clearFrameTimer()
})

const stateMessageKey = computed(() => {
  if (!errorKey.value) {
    return null
  }
  return `insights.states.${errorKey.value}`
})

const settingsLink = '/settings/insights'
</script>

<template>
  <div class="flex flex-col gap-4">
    <UAlert
      v-if="showValidationWarning"
      color="warning"
      variant="subtle"
      :title="$t('insights.states.validationWarning')"
      :description="$t(`insights.validation.${report.validation_status}`)"
    />

    <UAlert
      v-if="isIframeProvider"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('insights.embed.iframeAuthNote')"
    />

    <div
      v-if="errorKey"
      class="flex flex-col items-start gap-3 rounded-lg border border-default p-6"
    >
      <p class="text-highlighted font-medium">
        {{ stateMessageKey ? $t(stateMessageKey) : $t('insights.states.generic') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="errorKey === 'account_archived' || errorKey === 'credentials_unreadable'"
          :to="settingsLink"
          color="primary"
          size="sm"
        >
          {{ $t('insights.states.openSettings') }}
        </UButton>
        <UButton
          v-else-if="errorKey === 'param_unresolved' || errorKey === 'unknown_dynamic_key'"
          :to="settingsLink"
          color="primary"
          size="sm"
        >
          {{ $t('insights.states.openReportSettings') }}
        </UButton>
        <UButton
          v-else-if="errorKey === 'site_required'"
          color="primary"
          size="sm"
          @click="siteContext.requestFocus()"
        >
          {{ $t('insights.states.chooseSite') }}
        </UButton>
        <UButton
          v-else
          color="primary"
          size="sm"
          :loading="pending"
          @click="onRetry"
        >
          {{ $t('insights.embed.retry') }}
        </UButton>
      </div>
    </div>

    <template v-else>
      <div
        v-if="titled"
        class="flex items-center justify-between gap-3"
      >
        <h1 class="text-highlighted text-xl font-semibold">
          {{ title }}
        </h1>
        <UBadge
          v-if="downloads"
          color="neutral"
          variant="subtle"
          :label="$t('insights.embed.downloadsEnabled')"
        />
      </div>

      <div
        class="relative min-h-[320px] w-full bg-default"
        :class="bordered ? 'rounded-lg border border-default' : ''"
        :style="frameWrapStyle"
      >
        <div
          v-if="pending || framePending"
          class="absolute inset-0 z-10 flex items-center justify-center bg-default/80"
        >
          <div class="flex flex-col items-center gap-3">
            <USkeleton class="h-8 w-48" />
            <USkeleton class="h-4 w-32" />
            <p class="text-muted text-sm">
              {{ $t('insights.embed.loading') }}
            </p>
          </div>
        </div>

        <div
          v-if="frameTimedOut"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-default p-6"
        >
          <p class="text-highlighted text-center font-medium">
            {{ $t('insights.states.iframe_timeout') }}
          </p>
          <UButton
            color="primary"
            size="sm"
            @click="onRetry"
          >
            {{ $t('insights.embed.retry') }}
          </UButton>
        </div>

        <iframe
          v-if="url"
          :key="url"
          ref="frameEl"
          :src="url"
          class="block min-h-[320px] w-full"
          :style="frameStyle"
          :title="title"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerpolicy="strict-origin-when-cross-origin"
          @load="onFrameLoad"
        />
      </div>
    </template>
  </div>
</template>
