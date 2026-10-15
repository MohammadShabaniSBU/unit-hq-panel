<script setup lang="ts">
import type { EmailSelection, EmailV2Block, InsertableBlockType } from '~/types/email-builder'
import { createDefaultBlockParams, variantUsesHtml, workingVariants } from '~/types/email-builder'
import type { SampleContextItem } from '~/composables/useEmailTemplates'
import type { BlockOp } from '~/utils/emailBlockOps'
import { findBlock, findColumn } from '~/utils/emailBlockOps'
import {
  collectIds,
  countEmailBlocks,
  createSection,
  emailDocumentFromVariant,
  emptyEmailDocument,
  newEmailId
} from '~/utils/emailBlocks'

const route = useRoute()
const id = route.params.id as string
const { t } = useI18n()
const toast = useToast()

const { family, pending, error, refresh } = useEmailTemplateGet(id)
const {
  publishing,
  discarding,
  openingDraft,
  publishWarnings,
  showHistory,
  basedOnNumber,
  contentReadonly,
  edit,
  publish,
  discard,
  onRestored
} = useTemplateVersionControls(id, family, refresh)
const {
  saving,
  saveFamilyName,
  saveVariant,
  createVariant,
  fetchSampleContexts,
  previewHtml: fetchPreviewHtml,
  testSend,
  uploadAsset
} = useEmailTemplateEditor(id)

type EditorMode = 'blocks' | 'html'

const templateName = ref('')
const activeLocale = ref<string | null>(null)
const subject = ref('')
const editorMode = ref<EditorMode>('blocks')
const htmlSource = ref('')
const showModeSwitch = ref(false)
const pendingMode = ref<EditorMode | null>(null)
const blocksDocument = ref(emptyEmailDocument())
const selection = ref<EmailSelection | null>(null)
const pendingInsert = ref<{ columnId: string, index: number } | null>(null)
const saveRefresh = ref(false)
const history = useEditorHistory(blocksDocument)
const canUndo = computed(() => history.undoStack.value.length > 0)
const canRedo = computed(() => history.redoStack.value.length > 0)
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
const refreshing = ref(false)

const variants = computed(() => family.value ? workingVariants(family.value) : [])

const activeVariant = computed(() =>
  variants.value.find(v => v.locale === activeLocale.value) ?? variants.value[0] ?? null
)

const localeTabs = computed(() => variants.value.map(v => v.locale))

const availableLocales = computed(() => {
  const used = new Set(localeTabs.value)
  return ['es', 'en', 'fr'].filter(l => !used.has(l)).map(l => ({ label: l, value: l }))
})

const copyFromOptions = computed(() =>
  variants.value.map(v => ({
    label: v.locale,
    value: v.id
  }))
)

watch(family, (f) => {
  if (!f) return
  templateName.value = f.name
  const next = workingVariants(f)
  if (!activeLocale.value || !next.some(v => v.locale === activeLocale.value)) {
    activeLocale.value = next[0]?.locale ?? null
  }
}, { immediate: true })

watch(activeVariant, (variant) => {
  if (!variant || saveRefresh.value) return
  subject.value = variant.subject ?? ''
  selection.value = null
  pendingInsert.value = null
  showModeSwitch.value = false
  pendingMode.value = null
  history.reset()
  if (variantUsesHtml(variant)) {
    editorMode.value = 'html'
    htmlSource.value = variant.legacy_html ?? ''
    blocksDocument.value = emptyEmailDocument()
    return
  }
  editorMode.value = 'blocks'
  htmlSource.value = ''
  blocksDocument.value = emailDocumentFromVariant(variant.blocks)
}, { immediate: true })

function applyMode(next: EditorMode) {
  editorMode.value = next
  htmlSource.value = ''
  blocksDocument.value = emptyEmailDocument()
  selection.value = null
  pendingInsert.value = null
  history.reset()
  showModeSwitch.value = false
  pendingMode.value = null
}

function requestMode(next: EditorMode) {
  if (contentReadonly.value || next === editorMode.value) return
  const leavingHasContent = editorMode.value === 'html'
    ? htmlSource.value.trim() !== ''
    : blocksDocument.value.sections.length > 0
  if (!leavingHasContent) {
    applyMode(next)
    return
  }
  pendingMode.value = next
  showModeSwitch.value = true
}

function confirmModeSwitch() {
  if (!pendingMode.value) return
  applyMode(pendingMode.value)
}

function commitOps(ops: Array<BlockOp>, coalesceKey?: string) {
  if (contentReadonly.value || ops.length === 0) return false
  const committed = history.commit(ops, ops[0]?.op ?? 'edit', coalesceKey ? { key: coalesceKey } : undefined)
  if (!committed) return false
  if (selection.value && !selectionStillThere(selection.value)) selection.value = null
  return true
}

function selectionStillThere(current: EmailSelection): boolean {
  if (current.kind === 'section') return blocksDocument.value.sections.some(section => section.id === current.id)
  if (current.kind === 'column') return findColumn(blocksDocument.value, current.id) != null
  return findBlock(blocksDocument.value, current.id) != null
}

function makeBlock(type: InsertableBlockType, meta?: { level?: 1 | 2 }): EmailV2Block {
  return {
    id: newEmailId('blk', collectIds(blocksDocument.value)),
    type,
    params: { ...createDefaultBlockParams(type, meta) } as Record<string, unknown>
  }
}

function targetColumnId(): string | null {
  if (pendingInsert.value) return pendingInsert.value.columnId
  const current = selection.value
  if (!current) return null
  if (current.kind === 'column') return current.id
  if (current.kind === 'block') return findBlock(blocksDocument.value, current.id)?.column.id ?? null
  return null
}

function addBlock(type: InsertableBlockType, meta?: { level?: 1 | 2 }) {
  if (contentReadonly.value) return
  const block = makeBlock(type, meta)
  const columnId = targetColumnId()
  if (!columnId) {
    const section = createSection('100', collectIds(blocksDocument.value), [block])
    commitOps([{ op: 'add_section', index: blocksDocument.value.sections.length, section }])
    selection.value = { kind: 'block', id: block.id }
    pendingInsert.value = null
    return
  }
  const column = findColumn(blocksDocument.value, columnId)
  const index = pendingInsert.value?.columnId === columnId
    ? pendingInsert.value.index
    : (column?.column.blocks.length ?? 0)
  commitOps([{ op: 'insert_blocks', column_id: columnId, index, blocks: [block] }])
  selection.value = { kind: 'block', id: block.id }
  pendingInsert.value = null
}

function onCanvasOps(ops: Array<BlockOp>) {
  const added = ops.find(op => op.op === 'add_section')
  const inserted = ops.find(op => op.op === 'insert_blocks')
  commitOps(ops)
  if (added && added.op === 'add_section') {
    const block = added.section.columns[0]?.blocks[0]
    selection.value = block
      ? { kind: 'block', id: block.id }
      : { kind: 'section', id: added.section.id }
  } else if (inserted && inserted.op === 'insert_blocks' && inserted.blocks[0]) {
    selection.value = { kind: 'block', id: inserted.blocks[0].id }
  }
}

function onDragFinish(payload: { snapshot: typeof blocksDocument.value, op: BlockOp | null }) {
  blocksDocument.value = payload.snapshot
  if (payload.op) commitOps([payload.op])
}

function nudge(direction: -1 | 1) {
  const current = selection.value
  if (!current) return
  if (current.kind === 'section') {
    const index = blocksDocument.value.sections.findIndex(section => section.id === current.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= blocksDocument.value.sections.length) return
    commitOps([{ op: 'move_section', section_id: current.id, to_index: target }])
    return
  }
  if (current.kind !== 'block') return
  const location = findBlock(blocksDocument.value, current.id)
  if (!location) return
  const target = location.blockIndex + direction
  if (target < 0 || target >= location.column.blocks.length) return
  commitOps([{
    op: 'move_block',
    block_id: current.id,
    to_column_id: location.column.id,
    to_index: target
  }])
}

function onEditorKey(event: KeyboardEvent) {
  if (contentReadonly.value || editorMode.value !== 'blocks') return
  const meta = event.metaKey || event.ctrlKey
  if (meta && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) history.redo()
    else history.undo()
    return
  }
  if (!event.altKey || meta || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
  const target = event.target
  if (target instanceof HTMLElement) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
  }
  event.preventDefault()
  nudge(event.key === 'ArrowUp' ? -1 : 1)
}

onMounted(() => window.addEventListener('keydown', onEditorKey))
onUnmounted(() => window.removeEventListener('keydown', onEditorKey))

async function handleSave() {
  if (!family.value || !activeVariant.value || contentReadonly.value) return
  const locale = activeVariant.value.locale
  await saveFamilyName(templateName.value)
  const result = editorMode.value === 'html'
    ? await saveVariant(activeVariant.value.id, {
        subject: subject.value,
        blocks: null,
        legacy_html: htmlSource.value
      })
    : await saveVariant(activeVariant.value.id, {
        subject: subject.value,
        blocks: blocksDocument.value
      })
  if (!result) return
  activeLocale.value = locale
  saveRefresh.value = true
  refreshing.value = true
  await refresh()
  refreshing.value = false
  saveRefresh.value = false
}

async function handleAddLocale() {
  if (!newLocale.value || contentReadonly.value) return
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
  if (!activeVariant.value || !contactId.value) {
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
    const location = selection.value?.kind === 'block'
      ? findBlock(blocksDocument.value, selection.value.id)
      : null
    const selected = location?.block
    if (selected?.type === 'image') {
      const current = selected.params as {
        alt?: string
        width_percent?: number
      }
      commitOps([{
        op: 'update_block',
        block_id: selected.id,
        params: {
          alt: current.alt ?? '',
          width_percent: current.width_percent ?? 100,
          asset_id: response.data.id,
          url: response.data.public_url
        }
      }])
    }
  } catch {
    toast.add({ title: t('templates.builder.uploadError'), color: 'error' })
  }
}

function goBack() {
  navigateTo('/marketing/templates/email')
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
        :eyebrow="$t('templates.builder.crumbEmail')"
        :saving="saving || refreshing"
        :block-count="countEmailBlocks(blocksDocument)"
        :show-block-count="editorMode === 'blocks'"
        :show-history="true"
        :show-undo="editorMode === 'blocks'"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :save-disabled="contentReadonly || refreshing"
        :subject-readonly="contentReadonly"
        @save="handleSave"
        @preview="openPreview"
        @back="goBack"
        @history="showHistory = true"
        @undo="history.undo()"
        @redo="history.redo()"
      />

      <EmailBuilderVersionBar
        :family="family"
        :based-on-number="basedOnNumber"
        :publishing="publishing"
        :discarding="discarding"
        :opening-draft="openingDraft"
        :warnings="publishWarnings"
        :show-history="false"
        @edit="edit"
        @publish="publish"
        @discard="discard"
        @history="showHistory = true"
        @warnings-seen="publishWarnings = []"
      />

      <div class="flex items-center gap-2 border-b border-default bg-default px-4 py-2">
        <span class="text-xs text-dimmed">
          {{ $t('templates.builder.locale') }}
        </span>
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
          :disabled="availableLocales.length === 0 || contentReadonly"
          @click="showAddLocale = true"
        />
        <div class="ml-auto flex items-center rounded-lg bg-muted p-0.5">
          <UButton
            size="xs"
            icon="i-lucide-layout-grid"
            :color="editorMode === 'blocks' ? 'primary' : 'neutral'"
            :variant="editorMode === 'blocks' ? 'solid' : 'ghost'"
            :label="$t('templates.builder.editorModeBlocks')"
            :disabled="contentReadonly"
            @click="requestMode('blocks')"
          />
          <UButton
            size="xs"
            icon="i-lucide-code"
            :color="editorMode === 'html' ? 'primary' : 'neutral'"
            :variant="editorMode === 'html' ? 'solid' : 'ghost'"
            :label="$t('templates.builder.editorModeHtml')"
            :disabled="contentReadonly"
            @click="requestMode('html')"
          />
        </div>
      </div>

      <div
        v-if="editorMode === 'html'"
        class="min-h-0 flex-1 overflow-hidden bg-muted/30 p-4"
      >
        <EmailBuilderHtmlSourceEditor
          v-model="htmlSource"
          :family-id="id"
          :purpose="family?.purpose ?? ''"
          :readonly="contentReadonly"
        />
      </div>

      <div
        v-else
        class="grid min-h-0 flex-1 overflow-hidden"
        :class="contentReadonly ? 'grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-[280px_minmax(0,1fr)_320px]'"
      >
        <div
          v-if="!contentReadonly"
          class="overflow-y-auto border-r border-default bg-default p-3"
        >
          <EmailBuilderBlockPalette @add-block="addBlock" />
        </div>

        <div class="overflow-hidden bg-muted/30 p-4">
          <EmailBuilderSectionCanvas
            :doc="blocksDocument"
            :selection="selection"
            :readonly="contentReadonly"
            @select="selection = $event"
            @ops="onCanvasOps"
            @drag-finish="onDragFinish"
            @insert-at="pendingInsert = $event"
          />
        </div>

        <div class="overflow-y-auto border-l border-default bg-default p-3">
          <EmailBuilderSelectionSettings
            :doc="blocksDocument"
            :selection="selection"
            :family-id="id"
            :purpose="family?.purpose ?? ''"
            :readonly="contentReadonly"
            @select="selection = $event"
            @ops="(ops, key) => commitOps(ops, key)"
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
        @refresh="loadPreview"
        @test-send="handleTestSend"
      />

      <UModal
        v-model:open="showModeSwitch"
        :title="$t('templates.builder.switchModeTitle')"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <p class="text-sm text-dimmed">
              {{ $t('templates.builder.switchModeBody') }}
            </p>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :label="$t('templates.builder.cancel')"
                @click="showModeSwitch = false"
              />
              <UButton
                :label="$t('templates.builder.switchModeConfirm')"
                @click="confirmModeSwitch"
              />
            </div>
          </div>
        </template>
      </UModal>

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

      <EmailBuilderVersionHistorySlideover
        v-model:open="showHistory"
        :family-id="id"
        channel="email"
        :draft-exists="family.draft_version != null"
        @restored="onRestored"
      />
    </template>
  </div>
</template>
