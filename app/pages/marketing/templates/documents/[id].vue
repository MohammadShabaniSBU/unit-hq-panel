<script setup lang="ts">
import { nanoid } from 'nanoid'
import type { EmailBlock, InsertableBlockType } from '~/types/email-builder'
import { createDefaultBlockParams, hydrateVariantDocument } from '~/types/email-builder'
import type { SampleContextItem } from '~/composables/useEmailTemplates'

const route = useRoute()
const id = route.params.id as string
const { t } = useI18n()
const toast = useToast()

const { family, pending, error, refresh } = useEmailTemplateGet(id)
const {
  saving,
  saveFamilyName,
  saveVariant,
  createVariant,
  fetchSampleContexts,
  previewHtml: fetchPreviewHtml,
  testSend,
  uploadAsset,
  documentFromBlocks
} = useEmailTemplateEditor(id)

const templateName = ref('')
const activeLocale = ref<string | null>(null)
const subject = ref('')
const blocks = ref<Array<EmailBlock>>([])
const selectedBlockId = ref<string | null>(null)
const insertAtIndex = ref<number | null>(null)
const showPreview = ref(false)
const showAddLocale = ref(false)
const newLocale = ref('en')
const copyFromVariantId = ref<number | null>(null)

const previewHtml = ref('')
const previewLoading = ref(false)
const sampleContexts = ref<Array<SampleContextItem>>([])
const contactId = ref<number | null>(null)
const contractId = ref<number | null>(null)
const testEmail = ref('')
const sendingTest = ref(false)

const activeVariant = computed(() =>
  family.value?.variants.find(v => v.locale === activeLocale.value) ?? family.value?.variants[0] ?? null
)

const localeTabs = computed(() => family.value?.variants.map(v => v.locale) ?? [])

const availableLocales = computed(() => {
  const used = new Set(localeTabs.value)
  return ['es', 'en', 'fr'].filter(l => !used.has(l)).map(l => ({ label: l, value: l }))
})

const copyFromOptions = computed(() =>
  (family.value?.variants ?? []).map(v => ({
    label: v.locale,
    value: v.id
  }))
)

watch(family, (f) => {
  if (!f) return
  templateName.value = f.name
  if (!activeLocale.value || !f.variants.some(v => v.locale === activeLocale.value)) {
    activeLocale.value = f.variants[0]?.locale ?? null
  }
}, { immediate: true })

watch(activeVariant, (variant) => {
  if (!variant) return
  subject.value = variant.subject ?? ''
  blocks.value = structuredClone(hydrateVariantDocument(variant).blocks)
  selectedBlockId.value = null
}, { immediate: true })

function addBlock(type: InsertableBlockType, meta?: { level?: 1 | 2 }) {
  const newBlock: EmailBlock = {
    id: nanoid(),
    type,
    params: createDefaultBlockParams(type, meta)
  }
  const index = insertAtIndex.value ?? blocks.value.length
  const next = [...blocks.value]
  next.splice(index, 0, newBlock)
  blocks.value = next
  selectedBlockId.value = newBlock.id
  insertAtIndex.value = null
}

function deleteBlock(blockId: string) {
  blocks.value = blocks.value.filter(b => b.id !== blockId)
  if (selectedBlockId.value === blockId) selectedBlockId.value = null
}

function moveBlock(blockId: string, direction: 'up' | 'down') {
  const index = blocks.value.findIndex(b => b.id === blockId)
  if (index < 0) return
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= blocks.value.length) return
  const next = [...blocks.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  blocks.value = next
}

const selectedBlock = computed(() =>
  blocks.value.find(b => b.id === selectedBlockId.value) ?? null
)

function updateBlock(updated: EmailBlock) {
  blocks.value = blocks.value.map(b => b.id === updated.id ? updated : b)
}

async function handleSave() {
  if (!family.value || !activeVariant.value) return
  await saveFamilyName(templateName.value)
  const result = await saveVariant(activeVariant.value.id, {
    subject: subject.value,
    blocks: documentFromBlocks(blocks.value)
  })
  if (result) {
    await refresh()
  }
}

async function handleAddLocale() {
  if (!newLocale.value) return
  try {
    await createVariant(
      newLocale.value,
      copyFromVariantId.value ?? undefined
    )
    showAddLocale.value = false
    activeLocale.value = newLocale.value
    await refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('templates.builder.addLocaleError'),
      color: 'error'
    })
  }
}

async function loadPreview() {
  if (!activeVariant.value || !contactId.value || !contractId.value) {
    previewHtml.value = ''
    return
  }
  previewLoading.value = true
  try {
    previewHtml.value = await fetchPreviewHtml(
      activeVariant.value.id,
      contactId.value,
      contractId.value
    )
  } catch {
    toast.add({ title: t('templates.builder.previewError'), color: 'error' })
  } finally {
    previewLoading.value = false
  }
}

async function openPreview() {
  showPreview.value = true
  if (sampleContexts.value.length === 0) {
    sampleContexts.value = await fetchSampleContexts()
    contactId.value = sampleContexts.value[0]?.contact.id ?? null
    contractId.value = sampleContexts.value[0]?.contracts[0]?.id ?? null
  }
  await loadPreview()
}

async function handleTestSend() {
  if (!activeVariant.value || !contactId.value || !testEmail.value) return
  sendingTest.value = true
  try {
    await testSend({
      variantId: activeVariant.value.id,
      to: testEmail.value,
      contactId: contactId.value,
      contractId: contractId.value
    })
    toast.add({ title: t('templates.builder.testSendSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('templates.builder.testSendError'), color: 'error' })
  } finally {
    sendingTest.value = false
  }
}

async function handleUploadImage(file: File) {
  try {
    const response = await uploadAsset(file)
    if (selectedBlock.value?.type === 'image') {
      const current = selectedBlock.value.params as {
        alt: string
        width_percent: number
        asset_id?: number | null
        url?: string | null
      }
      updateBlock({
        ...selectedBlock.value,
        params: {
          alt: current.alt,
          width_percent: current.width_percent,
          asset_id: response.data.id,
          url: response.data.public_url
        }
      })
    }
  } catch {
    toast.add({ title: t('templates.builder.uploadError'), color: 'error' })
  }
}

function goBack() {
  navigateTo('/marketing/templates/documents')
}

watch([contactId, contractId], () => {
  if (showPreview.value) loadPreview()
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error || !family"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-10 text-error"
      />
      <p class="text-sm text-dimmed">
        {{ $t('templates.builder.loadError') }}
      </p>
      <UButton
        :label="$t('templates.builder.back')"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        @click="goBack"
      />
    </div>

    <template v-else>
      <EmailBuilderEditorToolbar
        v-model:template-name="templateName"
        v-model:subject="subject"
        :saving="saving"
        :block-count="blocks.length"
        @save="handleSave"
        @preview="openPreview"
        @back="goBack"
      />

      <div class="flex items-center gap-2 border-b border-default px-4 py-2">
        <UButton
          v-for="locale in localeTabs"
          :key="locale"
          size="xs"
          :color="locale === activeLocale ? 'primary' : 'neutral'"
          :variant="locale === activeLocale ? 'solid' : 'ghost'"
          @click="activeLocale = locale"
        >
          {{ locale }}
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          :label="$t('templates.builder.addLocale')"
          :disabled="availableLocales.length === 0"
          @click="showAddLocale = true"
        />
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-[220px_1fr_400px] overflow-hidden">
        <div class="overflow-y-auto border-r border-default p-3">
          <EmailBuilderBlockPalette
            channel="document"
            @add-block="addBlock"
          />
        </div>

        <div class="overflow-hidden p-4">
          <EmailBuilderEditorCanvas
            v-model="blocks"
            v-model:selected-block-id="selectedBlockId"
            @delete-block="deleteBlock"
            @insert-at="(index) => { insertAtIndex = index }"
            @move-block="moveBlock"
          />
        </div>

        <div class="overflow-y-auto border-l border-default p-3">
          <EmailBuilderBlockSettings
            :block="selectedBlock"
            @update:block="updateBlock"
            @upload-image="handleUploadImage"
          />
        </div>
      </div>

      <EmailBuilderPreviewModal
        v-model:open="showPreview"
        v-model:contact-id="contactId"
        v-model:contract-id="contractId"
        v-model:test-email="testEmail"
        :preview-html="previewHtml"
        :loading="previewLoading"
        :sample-contexts="sampleContexts"
        :sending-test="sendingTest"
        :show-test-send="false"
        :contract-required="true"
        @refresh="loadPreview"
        @test-send="handleTestSend"
      />

      <UModal
        v-model:open="showAddLocale"
        :title="$t('templates.builder.addLocale')"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <UFormField :label="$t('templates.builder.locale')">
              <USelect
                v-model="newLocale"
                :items="availableLocales"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('templates.builder.copyFrom')">
              <USelect
                v-model="copyFromVariantId"
                :items="[{ label: '—', value: null }, ...copyFromOptions]"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :label="$t('templates.builder.cancel')"
                @click="showAddLocale = false"
              />
              <UButton
                :label="$t('templates.builder.addLocale')"
                @click="handleAddLocale"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
