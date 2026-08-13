<script setup lang="ts">
/* eslint-disable vue/no-v-html -- body is model text rendered through marked + DOMPurify */
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Permission } from '~/types/permissions'

const props = defineProps<{
  entity: 'contact' | 'deal'
  id: number
}>()

const { t, te } = useI18n()
const { can } = usePermissions()
const { formatRelativeActivity } = useContactFormatters()

const canView = computed(() => can(Permission.AiSummaryView))

const {
  current,
  inFlight,
  lastFailed,
  isStale,
  canGenerate,
  pending,
  generating,
  error,
  timedOut,
  generate
} = useAiSummary(props.entity, () => props.id)

const isGenerating = computed(() => inFlight.value !== null || generating.value)

const displayBody = computed(() => current.value?.body ?? null)

const errorMessage = computed(() => {
  if (timedOut.value) {
    return t('ai_summary.timeout')
  }
  const code = lastFailed.value?.error_code ?? null
  const fromApi = error.value
  if (code) {
    const key = `ai_summary.errors.${code}`
    return te(key) ? t(key) : t('ai_summary.errors.provider_unavailable')
  }
  if (fromApi && te(fromApi)) {
    return t(fromApi)
  }
  if (fromApi) {
    return t('ai_summary.errors.provider_unavailable')
  }
  return null
})

function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string
  return import.meta.client ? DOMPurify.sanitize(html) : html
}

function highlightLabel(key: string, labelKey: string | null): string {
  if (labelKey && te(labelKey)) {
    return t(labelKey)
  }
  const i18nKey = `ai_summary.highlights.${key}`
  if (te(i18nKey)) {
    return t(i18nKey)
  }
  return key
}

async function onGenerate() {
  await generate()
}
</script>

<template>
  <UCard v-if="canView">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <h2 class="text-sm font-medium text-dimmed truncate">
            {{ $t('ai_summary.title') }}
          </h2>
          <UBadge
            v-if="isStale && current"
            :label="$t('ai_summary.stale')"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
        <UButton
          v-if="canGenerate || isGenerating"
          :icon="current ? 'i-lucide-refresh-cw' : 'i-lucide-sparkles'"
          :label="current ? $t('ai_summary.regenerate') : $t('ai_summary.generate')"
          color="neutral"
          variant="ghost"
          size="xs"
          :loading="isGenerating"
          :disabled="!canGenerate || isGenerating"
          @click="onGenerate"
        />
      </div>
    </template>

    <div
      v-if="pending && !current && !inFlight"
      class="space-y-2"
    >
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-5/6" />
      <USkeleton class="h-4 w-2/3" />
    </div>

    <div
      v-else-if="!displayBody && isGenerating"
      class="space-y-2"
    >
      <p class="text-sm text-dimmed">
        {{ $t('ai_summary.generating') }}
      </p>
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-4/5" />
    </div>

    <div
      v-else-if="!displayBody"
      class="space-y-3"
    >
      <p class="text-sm text-dimmed">
        {{ $t('ai_summary.empty') }}
      </p>
      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <UButton
        v-if="canGenerate"
        icon="i-lucide-sparkles"
        :label="errorMessage ? $t('ai_summary.retry') : $t('ai_summary.generate')"
        color="primary"
        variant="soft"
        size="sm"
        :loading="generating"
        @click="onGenerate"
      />
      <p class="text-xs text-dimmed">
        {{ $t('ai_summary.disclaimer') }}
      </p>
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <div
        class="prose prose-sm dark:prose-invert max-w-none text-highlighted"
        :class="{ 'opacity-50': isGenerating }"
        v-html="renderMarkdown(displayBody)"
      />

      <ul
        v-if="current?.highlights?.length"
        class="space-y-1"
        :class="{ 'opacity-50': isGenerating }"
      >
        <li
          v-for="(item, index) in current.highlights"
          :key="`${item.key}-${index}`"
          class="flex gap-2 text-sm"
        >
          <span class="text-dimmed shrink-0">•</span>
          <span>
            <span class="text-dimmed">{{ highlightLabel(item.key, item.label_key) }}:</span>
            {{ ' ' }}{{ item.value }}
          </span>
        </li>
      </ul>

      <p
        v-if="isGenerating"
        class="text-xs text-dimmed"
      >
        {{ $t('ai_summary.generating') }}
      </p>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
        <UButton
          v-if="canGenerate"
          :label="$t('ai_summary.retry')"
          color="neutral"
          variant="link"
          size="xs"
          class="ml-1"
          @click="onGenerate"
        />
      </p>

      <div class="flex flex-col gap-1">
        <p
          v-if="current?.generated_at"
          class="text-xs text-dimmed"
          :title="current.generated_at"
        >
          {{ $t('ai_summary.generatedAt', { when: formatRelativeActivity(current.generated_at) }) }}
        </p>
        <p class="text-xs text-dimmed">
          {{ $t('ai_summary.disclaimer') }}
        </p>
      </div>
    </div>
  </UCard>
</template>
