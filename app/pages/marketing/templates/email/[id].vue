<script setup lang="ts">
import { nanoid } from 'nanoid'
import type { EmailBlock, BlockType } from '~/types/email-builder'
import { createDefaultBlockProps } from '~/types/email-builder'

const route = useRoute()
const id = route.params.id as string

const { template, pending, error } = useEmailTemplateGet(id)

const blocks = ref<Array<EmailBlock>>([])
const templateName = ref('')
const selectedBlockId = ref<string | null>(null)
const showPreview = ref(false)

watch(template, (tpl) => {
  if (tpl) {
    blocks.value = structuredClone(tpl.blocks)
    templateName.value = tpl.name
  }
}, { immediate: true })

const { saving, save } = useEmailTemplateSave()

function addBlock(type: BlockType, meta?: { level?: 1 | 2 | 3 }) {
  const newBlock: EmailBlock = {
    id: nanoid(),
    type,
    props: createDefaultBlockProps(type, meta)
  }
  blocks.value = [...blocks.value, newBlock]
  selectedBlockId.value = newBlock.id
}

function deleteBlock(id: string) {
  blocks.value = blocks.value.filter(b => b.id !== id)
  if (selectedBlockId.value === id) {
    selectedBlockId.value = null
  }
}

const selectedBlock = computed(() =>
  blocks.value.find(b => b.id === selectedBlockId.value) ?? null
)

function updateBlock(updated: EmailBlock) {
  blocks.value = blocks.value.map(b => b.id === updated.id ? updated : b)
}

async function handleSave() {
  if (!template.value) return
  const result = await save(template.value.id, {
    name: templateName.value,
    blocks: blocks.value
  })
  if (result) {
    templateName.value = result.name
  }
}

function goBack() {
  navigateTo('/marketing/templates/email')
}
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
      v-else-if="error || !template"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-10 text-error"
      />
      <p class="text-sm text-dimmed">
        {{ $t('pages.emailBuilder.loadError') }}
      </p>
      <UButton
        :label="$t('forms.emailBuilder.back')"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        @click="goBack"
      />
    </div>

    <template v-else>
      <EmailBuilderEditorToolbar
        v-model:template-name="templateName"
        :saving="saving"
        :block-count="blocks.length"
        @save="handleSave"
        @preview="showPreview = true"
        @back="goBack"
      />

      <div class="grid min-h-0 flex-1 grid-cols-[220px_1fr_400px] overflow-hidden">
        <div class="overflow-y-auto border-r border-default p-3">
          <EmailBuilderBlockPalette @add-block="addBlock" />
        </div>

        <div class="overflow-hidden p-4">
          <EmailBuilderEditorCanvas
            v-model="blocks"
            v-model:selected-block-id="selectedBlockId"
            @delete-block="deleteBlock"
          />
        </div>

        <div class="overflow-y-auto border-l border-default p-3">
          <EmailBuilderBlockSettings
            :block="selectedBlock"
            @update:block="updateBlock"
          />
        </div>
      </div>

      <EmailBuilderPreviewModal
        v-model:open="showPreview"
        :blocks="blocks"
        :template-name="templateName"
      />
    </template>
  </div>
</template>
