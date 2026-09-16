<script setup lang="ts">
import { isRichTextEmpty } from '~/utils/richText'

const SAMPLE_HTML: string = [
  '<h2>Follow-up after the tour</h2>',
  '<p>The renter asked about the <strong>ground-floor</strong> units and wanted <em>climate control</em>.</p>',
  '<p>Send the size guide: <a href="https://example.com">example.com</a></p>',
  '<ul><li>Confirm availability for next week</li><li>Quote the 10 m² class</li></ul>',
  '<ol><li>Call back tomorrow</li><li>Attach the offer</li></ol>'
].join('')

const { t } = useI18n()
const html = ref(SAMPLE_HTML)
const rawOpen = ref(false)

const previewEmpty = computed(() => isRichTextEmpty(html.value))
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <header>
      <h1 class="text-lg font-semibold tracking-tight text-highlighted">
        {{ t('demo.editor.title') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ t('demo.editor.subtitle') }}
      </p>
    </header>

    <div class="grid gap-6 lg:grid-cols-2">
      <UCard>
        <UFormField :label="t('demo.editor.fieldLabel')">
          <RichTextEditor
            v-model="html"
            :placeholder="t('demo.editor.placeholder')"
          />
        </UFormField>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-sm font-medium text-highlighted">
            {{ t('demo.editor.previewTitle') }}
          </h2>
        </template>
        <p
          v-if="previewEmpty"
          class="text-sm text-dimmed"
        >
          {{ t('demo.editor.previewEmpty') }}
        </p>
        <RichText
          v-else
          :html="html"
        />
      </UCard>
    </div>

    <UCard>
      <button
        type="button"
        class="flex w-full items-center justify-between text-sm font-medium text-highlighted"
        @click="rawOpen = !rawOpen"
      >
        <span>{{ t('demo.editor.rawTitle') }}</span>
        <UIcon
          :name="rawOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 text-dimmed"
        />
      </button>
      <pre
        v-if="rawOpen"
        class="mt-3 overflow-x-auto rounded-md bg-elevated p-3 text-xs text-dimmed whitespace-pre-wrap"
      >{{ previewEmpty ? t('demo.editor.rawEmpty') : html }}</pre>
    </UCard>
  </div>
</template>
