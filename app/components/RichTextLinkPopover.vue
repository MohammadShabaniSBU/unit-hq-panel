<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
}>()

const { t } = useI18n()
const open = ref(false)
const url = ref('')

const active = computed(() => props.editor.isActive('link'))
const disabled = computed(() => !props.editor.isEditable)

watch(() => props.editor, (editor, _, onCleanup) => {
  if (!editor) {
    return
  }

  const updateUrl = () => {
    const href = editor.getAttributes('link').href
    url.value = typeof href === 'string' ? href : ''
  }

  updateUrl()
  editor.on('selectionUpdate', updateUrl)

  onCleanup(() => {
    editor.off('selectionUpdate', updateUrl)
  })
}, { immediate: true })

function normalizeHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^javascript:/i.test(trimmed)) {
    return ''
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed
  }

  return `https://${trimmed}`
}

function setLink() {
  const href = normalizeHref(url.value)
  if (!href) {
    return
  }

  const { selection } = props.editor.state
  let chain = props.editor.chain().focus().extendMarkRange('link').setLink({ href })

  if (selection.empty) {
    chain = chain.insertContent({ type: 'text', text: href })
  }

  chain.run()
  url.value = href
  open.value = false
}

function removeLink() {
  props.editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .unsetLink()
    .setMeta('preventAutolink', true)
    .run()

  url.value = ''
  open.value = false
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    setLink()
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{ content: 'p-1' }"
  >
    <UTooltip :text="t('richText.link')">
      <UButton
        icon="i-lucide-link"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        :active="active"
        :disabled="disabled"
        :aria-label="t('richText.link')"
      />
    </UTooltip>

    <template #content>
      <UInput
        v-model="url"
        autofocus
        type="text"
        variant="none"
        :placeholder="t('richText.linkPlaceholder')"
        class="w-64"
        @keydown="handleKeyDown"
      >
        <div class="flex items-center">
          <UButton
            icon="i-lucide-corner-down-left"
            variant="ghost"
            size="sm"
            :disabled="!url && !active"
            :aria-label="t('richText.linkApply')"
            @click="setLink"
          />
          <USeparator
            orientation="vertical"
            class="mx-1 h-6"
          />
          <UButton
            icon="i-lucide-trash"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="!active"
            :aria-label="t('richText.linkRemove')"
            @click="removeLink"
          />
        </div>
      </UInput>
    </template>
  </UPopover>
</template>
