<script setup lang="ts">
import type { PlaybookToken } from '~/config/playbookKinds'
import { PLAYBOOK_KIND_CONFIGS } from '~/config/playbookKinds'

const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
}>(), {
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const source = ref<HTMLTextAreaElement | null>(null)
const gutter = ref<HTMLElement | null>(null)

const lineCount = computed(() => Math.max(1, props.modelValue.split('\n').length))
const lineNumbers = computed(() => Array.from({ length: lineCount.value }, (_, index) => index + 1))

const tokens = computed<Array<PlaybookToken>>(() => [
  ...PLAYBOOK_KIND_CONFIGS.debt_process.tokens,
  ...PLAYBOOK_KIND_CONFIGS.lead_chase.tokens.filter(
    token => !PLAYBOOK_KIND_CONFIGS.debt_process.tokens.some(existing => existing.path === token.path)
  ),
  { path: 'contract.unit_name', labelKey: 'templates.builder.tokenUnitName' },
  { path: 'contract.unit_rate', labelKey: 'templates.builder.tokenUnitRate' },
  { path: 'contract.currency', labelKey: 'templates.builder.tokenCurrency' }
])

function onInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) return
  emit('update:modelValue', target.value)
}

function onScroll(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement) || !gutter.value) return
  gutter.value.scrollTop = target.scrollTop
}

function insertToken(token: string) {
  if (props.readonly) return
  const current = props.modelValue
  const field = source.value
  const start = field?.selectionStart ?? current.length
  const end = field?.selectionEnd ?? current.length
  const next = `${current.slice(0, start)}${token}${current.slice(end)}`
  emit('update:modelValue', next)
  nextTick(() => {
    if (!field) return
    field.focus()
    const cursor = start + token.length
    field.setSelectionRange(cursor, cursor)
  })
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="flex items-start justify-between gap-3">
      <p class="text-xs text-dimmed">
        {{ $t('templates.builder.htmlModeHint') }}
      </p>
      <PlaybooksTokenInsertMenu
        v-if="!readonly"
        :tokens="tokens"
        @insert="insertToken"
      />
    </div>
    <div class="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-default bg-default">
      <div
        ref="gutter"
        class="w-12 shrink-0 select-none overflow-hidden border-r border-default bg-muted/40 py-3 text-right font-mono text-xs leading-5 text-dimmed"
        aria-hidden="true"
      >
        <div
          v-for="line in lineNumbers"
          :key="line"
          class="px-2"
        >
          {{ line }}
        </div>
      </div>
      <textarea
        ref="source"
        :value="modelValue"
        :readonly="readonly"
        :aria-label="$t('templates.builder.editorModeHtml')"
        spellcheck="false"
        wrap="off"
        class="min-h-0 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-xs leading-5 text-default outline-none"
        @input="onInput"
        @scroll="onScroll"
      />
    </div>
  </div>
</template>
