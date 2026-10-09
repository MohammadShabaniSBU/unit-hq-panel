<script setup lang="ts">
import type { ApiTemplateVersion, EmailBlock } from '~/types/email-builder'
import { hydrateVariantDocument } from '~/types/email-builder'
import type { SampleContextItem } from '~/composables/useEmailTemplates'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  familyId: string
  channel: 'email' | 'document'
  draftExists: boolean
}>()

const emit = defineEmits<{
  restored: []
}>()

const { t } = useI18n()
const toast = useToast()
const { formatDateTime } = useOrgDateFormat()
const {
  fetchVersions,
  fetchVersion,
  createDraft,
  previewHtml,
  fetchSampleContexts
} = useEmailTemplateEditor(props.familyId)

const versions = ref<Array<ApiTemplateVersion>>([])
const loading = ref(false)
const detailLoading = ref(false)
const restoring = ref(false)
const selected = ref<ApiTemplateVersion | null>(null)
const activeLocale = ref<string | null>(null)
const selectedBlockId = ref<string | null>(null)
const previewHtmlText = ref('')
const previewLoading = ref(false)
const sampleContexts = ref<Array<SampleContextItem>>([])
const contactId = ref<number | null>(null)
const contractId = ref<number | null>(null)

const activeVariant = computed(() =>
  selected.value?.variants?.find(variant => variant.locale === activeLocale.value)
  ?? selected.value?.variants?.[0]
  ?? null
)

const blocks = computed<Array<EmailBlock>>(() => {
  if (!activeVariant.value) return []
  return hydrateVariantDocument(activeVariant.value).blocks
})

function basedOnLabel(version: ApiTemplateVersion): string | null {
  if (version.based_on_version_id == null) return null
  const source = versions.value.find(item => item.id === version.based_on_version_id)
  if (!source) return null
  return t('templates.builder.basedOn', { version: source.version_number })
}

function statusLabel(version: ApiTemplateVersion): string {
  if (version.status === 'published') return t('templates.builder.statusPublished')
  return t('templates.builder.statusDraft')
}

async function loadList() {
  loading.value = true
  selected.value = null
  previewHtmlText.value = ''
  versions.value = await fetchVersions()
  loading.value = false
}

async function ensureSample() {
  if (props.channel !== 'document' || sampleContexts.value.length > 0) return
  sampleContexts.value = await fetchSampleContexts()
  contactId.value = sampleContexts.value[0]?.contact.id ?? null
  contractId.value = sampleContexts.value[0]?.contracts[0]?.id ?? null
}

async function loadDocumentPreview() {
  const variant = activeVariant.value
  if (props.channel !== 'document' || !variant) {
    previewHtmlText.value = ''
    return
  }
  await ensureSample()
  if (!contactId.value || !contractId.value) {
    previewHtmlText.value = ''
    return
  }
  previewLoading.value = true
  try {
    previewHtmlText.value = await previewHtml(
      variant.id,
      contactId.value,
      contractId.value
    )
  } catch {
    previewHtmlText.value = ''
    toast.add({ title: t('templates.builder.previewError'), color: 'error' })
  } finally {
    previewLoading.value = false
  }
}

function chooseLocale(locale: string) {
  activeLocale.value = locale
  void loadDocumentPreview()
}

async function selectVersion(version: ApiTemplateVersion) {
  detailLoading.value = true
  const detail = await fetchVersion(version.id)
  detailLoading.value = false
  if (!detail) return
  selected.value = detail
  activeLocale.value = detail.variants?.[0]?.locale ?? detail.locales?.[0] ?? null
  selectedBlockId.value = null
  await loadDocumentPreview()
}

async function restore() {
  if (!selected.value || props.draftExists) return
  restoring.value = true
  const family = await createDraft(selected.value.id)
  restoring.value = false
  if (!family) {
    toast.add({ title: t('templates.builder.restoreError'), color: 'error' })
    return
  }
  toast.add({ title: t('templates.builder.restoreSuccess'), color: 'success' })
  open.value = false
  emit('restored')
}

watch(open, (isOpen) => {
  if (isOpen) {
    void loadList()
  }
})
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('templates.builder.historyTitle')"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <p
        v-else-if="!versions.length"
        class="text-sm text-dimmed"
      >
        {{ $t('templates.builder.historyEmpty') }}
      </p>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <ul class="flex flex-col gap-2">
          <li
            v-for="version in versions"
            :key="version.id"
          >
            <button
              type="button"
              class="flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left"
              :class="selected?.id === version.id ? 'border-primary' : 'border-default'"
              @click="selectVersion(version)"
            >
              <span class="flex flex-wrap items-center gap-2">
                <span class="font-medium">v{{ version.version_number }}</span>
                <UBadge
                  :label="statusLabel(version)"
                  :color="version.status === 'published' ? 'success' : 'warning'"
                  variant="subtle"
                  size="sm"
                />
              </span>
              <span
                v-if="version.published_at"
                class="text-xs text-dimmed"
              >
                {{ $t('templates.builder.publishedAt', { date: formatDateTime(version.published_at) }) }}
                <template v-if="version.published_by != null">
                  {{ $t('templates.builder.publishedBy', { id: version.published_by }) }}
                </template>
              </span>
              <span
                v-if="basedOnLabel(version)"
                class="text-xs text-dimmed"
              >
                {{ basedOnLabel(version) }}
              </span>
              <span
                v-if="version.locales?.length"
                class="text-xs text-dimmed"
              >
                {{ version.locales.join(', ') }}
              </span>
            </button>
          </li>
        </ul>

        <div
          v-if="detailLoading"
          class="flex items-center justify-center py-8"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin text-dimmed"
          />
        </div>

        <template v-else-if="selected">
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-for="variant in selected.variants ?? []"
              :key="variant.id"
              size="xs"
              :color="variant.locale === activeLocale ? 'primary' : 'neutral'"
              :variant="variant.locale === activeLocale ? 'solid' : 'ghost'"
              @click="chooseLocale(variant.locale)"
            >
              {{ variant.locale }}
            </UButton>
          </div>

          <p
            v-if="channel === 'email' && activeVariant"
            class="text-sm"
          >
            <span class="text-dimmed">{{ $t('templates.builder.subject') }}: </span>
            {{ activeVariant.subject }}
          </p>

          <div
            v-if="channel === 'document'"
            class="overflow-hidden rounded-lg border border-default bg-white"
          >
            <div
              v-if="previewLoading"
              class="flex h-64 items-center justify-center"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin text-dimmed"
              />
            </div>
            <iframe
              v-else-if="previewHtmlText"
              class="h-[480px] w-full border-0"
              sandbox=""
              :srcdoc="previewHtmlText"
              :title="$t('templates.builder.previewTitle')"
            />
            <p
              v-else
              class="p-4 text-sm text-dimmed"
            >
              {{ $t('templates.builder.documentPreviewNeedsContract') }}
            </p>
          </div>

          <EmailBuilderEditorCanvas
            :model-value="blocks"
            :selected-block-id="selectedBlockId"
            readonly
            @update:selected-block-id="selectedBlockId = $event"
          />

          <p
            v-if="draftExists"
            class="text-xs text-dimmed"
          >
            {{ $t('templates.builder.restoreBlocked') }}
          </p>
          <div class="flex justify-end">
            <UButton
              :label="$t('templates.builder.restore')"
              icon="i-lucide-rotate-ccw"
              :disabled="draftExists"
              :loading="restoring"
              @click="restore"
            />
          </div>
        </template>
      </div>
    </template>
  </USlideover>
</template>
