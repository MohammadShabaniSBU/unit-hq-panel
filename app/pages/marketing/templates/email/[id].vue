<script setup lang="ts">
import type { EmailSelection, EmailV2Block, InsertableBlockType } from '~/types/email-builder'
import { createDefaultBlockParams, variantUsesHtml, workingVariants } from '~/types/email-builder'
import type { SampleContextItem } from '~/composables/useEmailTemplates'
import type { BlockOp } from '~/utils/emailBlockOps'
import { findBlock, findColumn } from '~/utils/emailBlockOps'
import { canonicalHash, canonicalJson } from '~/utils/canonicalJson'
import { planAssistApply, touchedIdsFromOps, unwrapTurnOps } from '~/utils/assistApply'
import { selectionChipParts } from '~/utils/assistStarters'
import type { AssistTurnDetail } from '~/types/template-assist'
import type { HistoryMeta } from '~/composables/useEditorHistory'
import { Permission } from '~/types/permissions'
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
const dismissedSelectionKey = ref<string | null>(null)
const pendingInsert = ref<{ columnId: string, index: number } | null>(null)
const saveRefresh = ref(false)
const history = useEditorHistory(blocksDocument)
const canUndo = computed(() => history.undoStack.value.length > 0)
const canRedo = computed(() => history.redoStack.value.length > 0)
const { can } = usePermissions()
const assistUi = useTemplateAssistUiStore()
const highlightedIds = ref<Array<string>>([])
const ignoreSubjectWatch = ref(false)
const savedSnapshot = ref('')
const noticeKey = ref<string | null>(null)
const conflict = ref<{ turnId: number, turn: AssistTurnDetail } | null>(null)
const conflictCurrentHtml = ref('')
const conflictAssistantHtml = ref('')
const conflictLoading = ref(false)
const focusMode = ref(false)
const canAssist = computed(() =>
  can(Permission.TemplateManage)
  && can(Permission.TemplateAssistUse)
  && !contentReadonly.value
)
const assistLocale = computed(() => canAssist.value ? activeLocale.value : null)
const assist = useTemplateAssist(computed(() => id), assistLocale)
const assistantHint = computed(() => canAssist.value && editorMode.value === 'html')
const assistantErrorKey = computed(() => noticeKey.value ?? assist.error.value?.key ?? null)
const undoTurnId = computed(() => {
  const top = history.undoStack.value[history.undoStack.value.length - 1]
  if (!top || top.source !== 'assistant' || top.turnId == null) return null
  return top.turnId
})
const showChangesTurnId = computed(() =>
  highlightedIds.value.length > 0 ? undoTurnId.value : null
)
const assistMessages = computed(() => assist.messages.value)
const assistTurns = computed(() => assist.turns.value)
const assistStreamingText = computed(() => assist.streamingText.value)
const assistWorking = computed(() => assist.working.value)
const assistRunning = computed(() => assist.running.value)
const unsaved = computed(() =>
  savedSnapshot.value !== '' && editorSnapshot() !== savedSnapshot.value
)
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
    savedSnapshot.value = editorSnapshot()
    return
  }
  editorMode.value = 'blocks'
  htmlSource.value = ''
  blocksDocument.value = emailDocumentFromVariant(variant.blocks)
  savedSnapshot.value = editorSnapshot()
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

function editorSnapshot(): string {
  const body = editorMode.value === 'html'
    ? htmlSource.value
    : canonicalJson(blocksDocument.value)
  return `${subject.value}\n${body}`
}

function assignSubject(next: string) {
  ignoreSubjectWatch.value = true
  subject.value = next
  ignoreSubjectWatch.value = false
}

function assistantMeta(turnId: number, subjectBefore: string | null, subjectAfter: string | null): HistoryMeta {
  return {
    source: 'assistant',
    turnId,
    subjectBefore,
    subjectAfter
  }
}

function commitOps(ops: Array<BlockOp>, coalesceKey?: string) {
  if (contentReadonly.value || ops.length === 0) return false
  const committed = history.commit(ops, ops[0]?.op ?? 'edit', coalesceKey ? { key: coalesceKey } : undefined)
  if (!committed) return false
  highlightedIds.value = []
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

function selectionIdentity(current: EmailSelection | null): string | null {
  if (!current) return null
  return `${current.kind}:${current.id}`
}

const assistSelection = computed(() => {
  const current = selection.value
  if (!current) return null
  if (dismissedSelectionKey.value === selectionIdentity(current)) return null
  const parts = selectionChipParts(blocksDocument.value, current)
  if (!parts) return null
  const bits = [t('templates.builder.assistant.section', { n: parts.section })]
  if (parts.column != null) {
    bits.push(t('templates.builder.assistant.column', { n: parts.column }))
  }
  if (parts.blockLabelKey) bits.push(t(parts.blockLabelKey))
  return {
    kind: current.kind,
    id: current.id,
    label: t('templates.builder.assistant.editing', { path: bits.join(' › ') })
  }
})

function dismissSelectionChip() {
  dismissedSelectionKey.value = selectionIdentity(selection.value)
}

function focusAssistComposer() {
  const composers = document.querySelectorAll<HTMLTextAreaElement>('[data-assist-composer]')
  composers[composers.length - 1]?.focus()
}

function onEditorKey(event: KeyboardEvent) {
  const meta = event.metaKey || event.ctrlKey
  if (meta && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') {
    if (!canAssist.value || editorMode.value !== 'blocks') return
    event.preventDefault()
    assistUi.openAssistant()
    void nextTick(() => focusAssistComposer())
    return
  }
  if (contentReadonly.value || editorMode.value !== 'blocks') return
  const target = event.target
  if (target instanceof HTMLElement && target.closest('[data-assist-composer]')) return
  if (meta && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) void redoEdit()
    else void undoEdit()
    return
  }
  if (!event.altKey || meta || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
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
  savedSnapshot.value = editorSnapshot()
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

async function undoEdit() {
  const entry = history.undo()
  if (!entry) return
  if (entry.subjectBefore != null) assignSubject(entry.subjectBefore)
  highlightedIds.value = []
  if (entry.source === 'assistant' && entry.turnId != null) {
    await assist.reportStatus(entry.turnId, 'undone')
  }
}

async function redoEdit() {
  const entry = history.redo()
  if (!entry) return
  if (entry.subjectAfter != null) assignSubject(entry.subjectAfter)
  highlightedIds.value = []
  if (entry.source === 'assistant' && entry.turnId != null) {
    await assist.reportStatus(entry.turnId, 'applied')
  }
}

async function applyFinishedTurn(turnId: number, status: string) {
  if (status === 'failed') {
    try {
      const turn = await assist.fetchTurn(turnId)
      noticeKey.value = turn.error_key ?? 'assist.provider_error'
    } catch {
      noticeKey.value = 'assist.provider_error'
    }
    return
  }
  if (status !== 'completed') return
  const turn = await assist.fetchTurn(turnId)
  const ops = unwrapTurnOps(Array.isArray(turn.ops) ? turn.ops : [])
  const currentHash = await canonicalHash(blocksDocument.value)
  const plan = planAssistApply(blocksDocument.value, ops, currentHash === turn.base_hash)
  if (plan.outcome === 'conflict') {
    conflict.value = { turnId, turn }
    return
  }
  const subjectBefore = subject.value
  const nextSubject = turn.subject_change?.to ?? subjectBefore
  const meta = assistantMeta(
    turnId,
    turn.subject_change ? subjectBefore : null,
    turn.subject_change ? nextSubject : null
  )
  if (turn.subject_change) assignSubject(nextSubject)
  if (plan.ops.length > 0) {
    history.commit(plan.ops, 'assistant', undefined, meta)
  } else if (turn.subject_change) {
    history.commitReplace(blocksDocument.value, 'assistant', meta)
  }
  highlightedIds.value = plan.touchedIds
  await assist.reportStatus(turnId, 'applied')
  if (turn.error_key === 'assist.tool_budget_exhausted') noticeKey.value = turn.error_key
}

async function useAssistantVersion() {
  const current = conflict.value
  if (!current) return
  const turn = current.turn
  const subjectBefore = subject.value
  const nextSubject = turn.subject_change?.to ?? subjectBefore
  const meta = assistantMeta(
    current.turnId,
    turn.subject_change ? subjectBefore : null,
    turn.subject_change ? nextSubject : null
  )
  if (turn.subject_change) assignSubject(nextSubject)
  history.commitReplace(turn.working_document, 'assistant', meta)
  highlightedIds.value = touchedIdsFromOps(unwrapTurnOps(Array.isArray(turn.ops) ? turn.ops : []))
  conflict.value = null
  await assist.reportStatus(current.turnId, 'applied')
}

async function keepMine() {
  const current = conflict.value
  if (!current) return
  const turnId = current.turnId
  conflict.value = null
  await assist.reportStatus(turnId, 'discarded')
}

async function sendAssist(message: string) {
  const versionId = family.value?.draft_version?.id
  if (!versionId) return
  noticeKey.value = null
  assistUi.openAssistant()
  const current = assistSelection.value
  await assist.send(
    message,
    versionId,
    blocksDocument.value,
    current ? { kind: current.kind, id: current.id } : null
  )
}

async function reloadDraft() {
  assist.clearError()
  noticeKey.value = null
  await refresh()
}

function showAssistantChanges() {
  const nodeId = highlightedIds.value[0]
  if (!nodeId || !import.meta.client) return
  const escaped = CSS.escape(nodeId)
  const node = document.querySelector(
    `[data-section-id="${escaped}"], [data-block-id="${escaped}"], [data-column-id="${escaped}"]`
  )
  node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function undoAssistTurn(turnId: number) {
  if (undoTurnId.value !== turnId) return
  void undoEdit()
}

watch(subject, () => {
  if (ignoreSubjectWatch.value) return
  highlightedIds.value = []
})

watch(canAssist, (allowed) => {
  if (!allowed) assistUi.rightTab = 'settings'
})

watch(() => assist.finished.value, (event) => {
  if (!event) return
  void applyFinishedTurn(event.turnId, event.status)
})

watch(conflict, async (current) => {
  conflictCurrentHtml.value = ''
  conflictAssistantHtml.value = ''
  if (!current || !activeVariant.value) return
  conflictLoading.value = true
  try {
    if (sampleContexts.value.length === 0) {
      sampleContexts.value = await fetchSampleContexts()
      contactId.value = sampleContexts.value[0]?.contact.id ?? null
      contractId.value = sampleContexts.value[0]?.contracts[0]?.id ?? null
    }
    if (!contactId.value) return
    const variantId = activeVariant.value.id
    conflictCurrentHtml.value = await fetchPreviewHtml(
      variantId,
      contactId.value,
      contractId.value,
      blocksDocument.value
    )
    conflictAssistantHtml.value = await fetchPreviewHtml(
      variantId,
      contactId.value,
      contractId.value,
      current.turn.working_document
    )
  } catch {
    toast.add({ title: t('templates.builder.previewError'), color: 'error' })
  } finally {
    conflictLoading.value = false
  }
})

function goBack() {
  navigateTo('/marketing/templates/email')
}

watch([contactId, contractId], () => {
  if (showPreview.value) loadPreview()
})
</script>

<template>
  <div class="flex h-[calc(100svh-var(--ui-header-height))] min-h-0 flex-col overflow-hidden">
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
        :assistant-hint="assistantHint"
        :unsaved="unsaved"
        :show-focus="true"
        :focused="focusMode"
        :save-disabled="contentReadonly || refreshing"
        :subject-readonly="contentReadonly"
        @save="handleSave"
        @preview="openPreview"
        @back="goBack"
        @history="showHistory = true"
        @undo="undoEdit"
        @redo="redoEdit"
        @focus="focusMode = !focusMode"
      />

      <EmailBuilderVersionBar
        v-show="!focusMode"
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

      <div
        v-show="!focusMode"
        class="flex items-center gap-2 border-b border-default bg-default px-4 py-2"
      >
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
        class="grid min-h-0 flex-1 overflow-hidden [&>*]:min-h-0"
        :class="contentReadonly ? 'grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-[280px_minmax(0,1fr)_380px]'"
      >
        <div
          v-if="!contentReadonly"
          class="min-h-0 overflow-y-auto border-r border-default bg-default p-3"
        >
          <EmailBuilderBlockPalette @add-block="addBlock" />
        </div>

        <div class="min-h-0 overflow-y-auto bg-muted/30 p-4">
          <EmailBuilderSectionCanvas
            :doc="blocksDocument"
            :selection="selection"
            :readonly="contentReadonly"
            :highlighted-ids="highlightedIds"
            @select="selection = $event"
            @ops="onCanvasOps"
            @drag-finish="onDragFinish"
            @insert-at="pendingInsert = $event"
          >
            <template
              v-if="canAssist"
              #empty="{ insert }"
            >
              <EmailBuilderAssistantEmptyState
                :purpose="family?.purpose ?? ''"
                :disabled="assistRunning"
                @submit="sendAssist"
                @insert="insert()"
              />
            </template>
          </EmailBuilderSectionCanvas>
        </div>

        <div class="flex min-h-0 flex-col overflow-hidden border-l border-default bg-default">
          <div class="flex gap-1 border-b border-default p-2">
            <UButton
              size="xs"
              icon="i-lucide-settings"
              :color="assistUi.rightTab === 'settings' ? 'primary' : 'neutral'"
              :variant="assistUi.rightTab === 'settings' ? 'solid' : 'ghost'"
              :label="$t('templates.builder.settings')"
              @click="assistUi.rightTab = 'settings'"
            />
            <UButton
              v-if="canAssist"
              size="xs"
              icon="i-lucide-sparkles"
              :color="assistUi.rightTab === 'assistant' ? 'primary' : 'neutral'"
              :variant="assistUi.rightTab === 'assistant' ? 'solid' : 'ghost'"
              :label="$t('templates.builder.assistant.tab')"
              @click="assistUi.rightTab = 'assistant'"
            />
          </div>
          <div
            class="min-h-0 flex-1 p-3"
            :class="assistUi.rightTab === 'assistant' && canAssist ? 'overflow-hidden' : 'overflow-y-auto'"
          >
            <EmailBuilderAssistantPanel
              v-if="assistUi.rightTab === 'assistant' && canAssist"
              class="h-full"
              :messages="assistMessages"
              :turns="assistTurns"
              :streaming-text="assistStreamingText"
              :working="assistWorking"
              :running="assistRunning"
              :error-key="assistantErrorKey"
              :undo-turn-id="undoTurnId"
              :show-changes-turn-id="showChangesTurnId"
              :selection-label="assistSelection?.label ?? null"
              @send="sendAssist"
              @clear-selection="dismissSelectionChip"
              @stop="assist.stop()"
              @new-chat="assist.newChat()"
              @undo="undoAssistTurn"
              @show-changes="showAssistantChanges"
              @reload="reloadDraft"
            />
            <EmailBuilderSelectionSettings
              v-else
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
      </div>

      <EmailBuilderAssistantConflictView
        :open="conflict != null"
        :loading="conflictLoading"
        :current-html="conflictCurrentHtml"
        :assistant-html="conflictAssistantHtml"
        @update:open="(open) => { if (!open) keepMine() }"
        @use-assistant="useAssistantVersion"
        @keep-mine="keepMine"
      />

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
