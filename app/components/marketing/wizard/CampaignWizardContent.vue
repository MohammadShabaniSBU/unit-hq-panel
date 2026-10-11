<script setup lang="ts">
const wizard = useCampaignWizard()
const { t } = useI18n()

const fullSize = ref(false)

const emailModel = computed({
  get: () => wizard.emailFamilyId ?? undefined,
  set: (value: number | undefined) => {
    wizard.emailFamilyId = value ?? null
  }
})

const smsModel = computed({
  get: () => wizard.smsFamilyId ?? undefined,
  set: (value: number | undefined) => {
    wizard.smsFamilyId = value ?? null
  }
})

const emailEditTo = computed(() => wizard.emailFamilyId == null
  ? '/marketing/templates/email'
  : `/marketing/templates/email/${wizard.emailFamilyId}`)

const previewTitle = computed(() => {
  if (wizard.rendered?.subject) {
    return wizard.rendered.subject
  }
  if (wizard.subject.trim() !== '') {
    return wizard.subject.trim()
  }
  return wizard.contentSummary || t('pages.campaigns.wizard.previewEmpty')
})

const previewInitial = computed(() => {
  const source = previewTitle.value.trim()
  return source === '' ? '?' : source.slice(0, 1).toUpperCase()
})

const contentError = computed(() =>
  wizard.fieldError('sends') || wizard.fieldError('channel') || wizard.fieldError('template_family_id')
)

const previewFrame = ref<HTMLElement | null>(null)
const previewIframe = ref<HTMLIFrameElement | null>(null)
const contentWidth = ref(0)
const contentHeight = ref(0)
const previewScale = ref(1)

const fittedHeight = computed(() => {
  if (contentHeight.value === 0) {
    return '18rem'
  }
  return `${Math.max(1, Math.ceil(contentHeight.value * previewScale.value))}px`
})

const previewStyle = computed(() => {
  if (previewScale.value < 1 && contentWidth.value > 0) {
    return {
      width: `${contentWidth.value}px`,
      height: `${contentHeight.value}px`,
      transform: `scale(${previewScale.value})`,
      transformOrigin: 'top left'
    }
  }
  return {
    width: '100%',
    height: contentHeight.value === 0 ? '100%' : `${contentHeight.value}px`
  }
})

function fitPreviewDocument(doc: Document) {
  if (doc.getElementById('preview-fit') || !doc.head) {
    return
  }
  const style = doc.createElement('style')
  style.id = 'preview-fit'
  style.textContent = 'html,body{margin:0!important;width:100%!important;height:auto!important;overflow:hidden!important;}table{max-width:100%!important;}table[width="600"]{width:100%!important;}img{max-width:100%!important;height:auto!important;}'
  doc.head.appendChild(style)
}

function measurePreview() {
  const iframe = previewIframe.value
  const frame = previewFrame.value
  const doc = iframe?.contentDocument
  if (!iframe || !frame || !doc?.documentElement) {
    return
  }

  fitPreviewDocument(doc)
  iframe.style.width = '100%'
  iframe.style.transform = 'none'
  const boxWidth = frame.clientWidth
  const width = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth ?? 0)
  const height = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0)
  if (width === 0 || height === 0 || boxWidth === 0) {
    return
  }

  if (width > boxWidth + 1) {
    contentWidth.value = width
    contentHeight.value = height
    previewScale.value = boxWidth / width
  } else {
    contentWidth.value = 0
    contentHeight.value = height
    previewScale.value = 1
  }

  doc.querySelectorAll('img').forEach((img) => {
    if (!img.complete) {
      img.addEventListener('load', () => measurePreview(), { once: true })
    }
  })
}

watch(() => wizard.safeHtml, () => {
  contentWidth.value = 0
  contentHeight.value = 0
  previewScale.value = 1
})

watch(previewFrame, (frame, _previous, onCleanup) => {
  if (!frame) {
    return
  }
  const observer = new ResizeObserver(() => measurePreview())
  observer.observe(frame)
  onCleanup(() => observer.disconnect())
})
</script>

<template>
  <div class="contents">
    <section class="rounded-2xl bg-default p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.campaigns.wizard.contentTitle') }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ t('pages.campaigns.wizard.contentSubtitle') }}
      </p>

      <p
        v-if="contentError"
        class="mt-4 text-sm text-error"
      >
        {{ contentError }}
      </p>

      <p class="mt-8 text-sm font-medium text-highlighted">
        {{ t('pages.campaigns.wizard.channels') }}
      </p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
          :class="wizard.emailOn
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-default bg-default hover:border-primary/40'"
          @click="wizard.emailOn = !wizard.emailOn"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-mail"
              class="size-4"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-highlighted">
              {{ t('pages.campaigns.channels.email') }}
            </span>
            <span class="mt-0.5 block text-xs text-dimmed">
              {{ t('pages.campaigns.wizard.emailHint') }}
            </span>
          </span>
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded border"
            :class="wizard.emailOn ? 'border-primary bg-primary text-white' : 'border-default'"
          >
            <UIcon
              v-if="wizard.emailOn"
              name="i-lucide-check"
              class="size-3.5"
            />
          </span>
        </button>

        <button
          type="button"
          class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
          :class="wizard.smsOn
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-default bg-default hover:border-primary/40'"
          @click="wizard.smsOn = !wizard.smsOn"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted">
            <UIcon
              name="i-lucide-message-square"
              class="size-4"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-highlighted">
              {{ t('pages.campaigns.channels.sms') }}
            </span>
            <span class="mt-0.5 block text-xs text-dimmed">
              {{ t('pages.campaigns.wizard.smsHint') }}
            </span>
          </span>
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded border"
            :class="wizard.smsOn ? 'border-primary bg-primary text-white' : 'border-default'"
          >
            <UIcon
              v-if="wizard.smsOn"
              name="i-lucide-check"
              class="size-3.5"
            />
          </span>
        </button>
      </div>

      <div
        v-if="wizard.emailOn"
        class="mt-4 rounded-xl bg-muted/60 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('pages.campaigns.channels.email') }}
          </p>
          <UButton
            :to="emailEditTo"
            variant="link"
            color="primary"
            size="sm"
            :label="t('pages.campaigns.wizard.editTemplate')"
            class="px-0"
          />
        </div>
        <label class="mt-3 block text-sm font-medium text-highlighted">
          {{ t('pages.campaigns.template') }}
        </label>
        <USelect
          v-model="emailModel"
          :items="wizard.emailItems"
          value-key="value"
          class="mt-1.5 w-full"
        />
        <label class="mt-4 block text-sm font-medium text-highlighted">
          {{ t('pages.campaigns.wizard.subjectOptional') }}
        </label>
        <UInput
          v-model="wizard.subject"
          class="mt-1.5 w-full"
          :placeholder="t('pages.campaigns.wizard.subjectPlaceholder')"
        />
        <p
          v-if="wizard.fieldError('subject_override')"
          class="mt-1 text-sm text-error"
        >
          {{ wizard.fieldError('subject_override') }}
        </p>
      </div>

      <div
        v-if="wizard.smsOn"
        class="mt-4 rounded-xl bg-muted/60 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('pages.campaigns.channels.sms') }}
          </p>
          <UButton
            to="/marketing/templates/sms"
            variant="link"
            color="primary"
            size="sm"
            :label="t('pages.campaigns.wizard.editTemplate')"
            class="px-0"
          />
        </div>
        <label class="mt-3 block text-sm font-medium text-highlighted">
          {{ t('pages.campaigns.template') }}
        </label>
        <USelect
          v-model="smsModel"
          :items="wizard.smsItems"
          value-key="value"
          class="mt-1.5 w-full"
        />
        <p
          v-if="wizard.rendered?.sms_segments || wizard.audience?.sms_segments"
          class="mt-2 text-sm text-dimmed"
        >
          {{ t('pages.campaigns.smsSegments', { count: wizard.rendered?.sms_segments ?? wizard.audience?.sms_segments }) }}
        </p>
      </div>

      <div class="mt-8 flex items-center justify-between border-t border-default pt-5">
        <UButton
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-arrow-left"
          :label="t('pages.campaigns.back')"
          @click="wizard.onBack"
        />
        <UButton
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          :label="t('pages.campaigns.wizard.continueSchedule')"
          :loading="wizard.saving"
          @click="wizard.onNext"
        />
      </div>
    </section>

    <div>
      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-dimmed">
          {{ t('pages.campaigns.wizard.previewEyebrow') }}
        </p>
        <UButton
          variant="link"
          color="primary"
          size="sm"
          :label="t('pages.campaigns.wizard.openFullSize')"
          :disabled="wizard.safeHtml === ''"
          class="px-0"
          @click="fullSize = true"
        />
      </div>
      <div class="rounded-2xl border border-default bg-default p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <span class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {{ previewInitial }}
          </span>
          <p class="min-w-0 truncate text-sm font-medium text-highlighted">
            {{ previewTitle }}
          </p>
        </div>
        <div
          v-if="wizard.safeHtml"
          ref="previewFrame"
          class="relative mt-4 w-full overflow-hidden rounded-xl border border-default bg-white"
          :style="{ height: fittedHeight }"
        >
          <iframe
            ref="previewIframe"
            class="pointer-events-none absolute top-0 left-0 overflow-hidden border-0 bg-white"
            sandbox="allow-same-origin"
            scrolling="no"
            :srcdoc="wizard.safeHtml"
            :style="previewStyle"
            :title="t('pages.campaigns.contentPreview')"
            @load="measurePreview"
          />
        </div>
        <pre
          v-else-if="wizard.rendered?.text"
          class="mt-4 whitespace-pre-wrap rounded-xl bg-cosmos-950 p-4 text-sm text-white"
        >{{ wizard.rendered.text }}</pre>
        <div
          v-else
          class="mt-4 rounded-xl bg-cosmos-950 px-6 py-10 text-center text-white"
        >
          <UIcon
            name="i-lucide-sparkles"
            class="mx-auto size-5 text-ember-300"
          />
          <p class="mt-3 text-lg font-semibold">
            {{ previewTitle }}
          </p>
        </div>
      </div>
      <p class="mt-3 text-xs text-dimmed">
        {{ t('pages.campaigns.wizard.mergeNote') }}
      </p>

      <UModal
        v-model:open="fullSize"
        :title="t('pages.campaigns.wizard.previewEyebrow')"
        :ui="{ content: 'max-w-3xl' }"
      >
        <template #body>
          <iframe
            v-if="wizard.safeHtml"
            class="h-[70vh] w-full rounded-md border border-default bg-white"
            sandbox=""
            :srcdoc="wizard.safeHtml"
            :title="t('pages.campaigns.contentPreview')"
          />
        </template>
      </UModal>
    </div>
  </div>
</template>
