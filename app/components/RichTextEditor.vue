<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'

const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: '',
  disabled: false
})

const { t } = useI18n()

const starterKit = {
  heading: { levels: [1, 2, 3] },
  blockquote: false,
  code: false,
  codeBlock: false,
  strike: false,
  horizontalRule: false,
  link: {
    openOnClick: false
  }
}

const placeholderOptions = computed(() => {
  if (!props.placeholder) {
    return undefined
  }

  return {
    placeholder: props.placeholder,
    mode: 'firstLine' as const
  }
})

const toolbarItems = computed<Array<Array<EditorToolbarItem>>>(() => [
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: t('richText.headings') },
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: t('richText.heading1') },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: t('richText.heading2') },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: t('richText.heading3') }
      ]
    }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: t('richText.bold') } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: t('richText.italic') } }
  ],
  [
    { slot: 'link' as const }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: t('richText.bulletList') } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: t('richText.orderedList') } }
  ]
])
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default">
    <UEditor
      v-model="model"
      content-type="html"
      :editable="!disabled"
      :placeholder="placeholderOptions"
      :starter-kit="starterKit"
      :image="false"
      :mention="false"
      :ui="{
        base: [
          'px-2.5 py-2 sm:px-2.5 min-h-[88px] text-sm',
          '*:my-1.5 *:first:mt-0 *:last:mb-0',
          '[&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm'
        ].join(' ')
      }"
    >
      <template #default="{ editor }">
        <div class="border-b border-default px-1 py-0.5">
          <UEditorToolbar
            :editor="editor"
            :items="toolbarItems"
            size="sm"
          >
            <template #link>
              <RichTextLinkPopover :editor="editor" />
            </template>
          </UEditorToolbar>
        </div>
      </template>
    </UEditor>
  </div>
</template>
