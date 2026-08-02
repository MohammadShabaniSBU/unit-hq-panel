<script setup lang="ts">
import type {
  EmailBlock,
  ParagraphBlockParams,
  HeadingBlockParams,
  ImageBlockParams,
  ButtonBlockParams,
  SpacerBlockParams,
  RawHtmlBlockParams
} from '~/types/email-builder'
import { PLAYBOOK_KIND_CONFIGS } from '~/config/playbookKinds'

const props = defineProps<{
  block: EmailBlock | null
}>()

const emit = defineEmits<{
  'update:block': [block: EmailBlock]
  'upload-image': [file: File]
}>()

const tokens = computed(() => [
  ...PLAYBOOK_KIND_CONFIGS.debt_process.tokens,
  ...PLAYBOOK_KIND_CONFIGS.lead_chase.tokens.filter(
    t => !PLAYBOOK_KIND_CONFIGS.debt_process.tokens.some(d => d.path === t.path)
  ),
  { path: 'contract.unit_name', labelKey: 'templates.builder.tokenUnitName' },
  { path: 'contract.unit_rate', labelKey: 'templates.builder.tokenUnitRate' },
  { path: 'contract.currency', labelKey: 'templates.builder.tokenCurrency' }
])

function update(partial: Record<string, unknown>) {
  if (!props.block) return
  const merged = { ...(props.block.params as Record<string, unknown>), ...partial }
  emit('update:block', {
    ...props.block,
    params: merged as EmailBlock['params']
  })
}

function insertToken(field: string, token: string) {
  if (!props.block) return
  const current = String((props.block.params as Record<string, unknown>)[field] ?? '')
  update({ [field]: `${current}${token}` })
}

const paragraphParams = computed(() =>
  props.block?.type === 'paragraph' ? props.block.params as ParagraphBlockParams : null
)
const headingParams = computed(() =>
  props.block?.type === 'heading' ? props.block.params as HeadingBlockParams : null
)
const imageParams = computed(() =>
  props.block?.type === 'image' ? props.block.params as ImageBlockParams : null
)
const buttonParams = computed(() =>
  props.block?.type === 'button' ? props.block.params as ButtonBlockParams : null
)
const spacerParams = computed(() =>
  props.block?.type === 'spacer' ? props.block.params as SpacerBlockParams : null
)
const rawHtmlParams = computed(() =>
  props.block?.type === 'raw_html' ? props.block.params as RawHtmlBlockParams : null
)

const styleOptions = computed(() => [
  { label: 'Primary', value: 'primary' },
  { label: 'Outline', value: 'outline' }
])

const levelOptions = [
  { label: 'H1', value: 1 },
  { label: 'H2', value: 2 }
]

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload-image', file)
  input.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="mb-1 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('templates.builder.settings') }}
    </div>

    <div
      v-if="!block"
      class="flex flex-col items-center gap-2 py-8 text-center"
    >
      <UIcon
        name="i-lucide-mouse-pointer-click"
        class="size-6 text-dimmed"
      />
      <p class="text-xs text-dimmed">
        {{ $t('templates.builder.settingsEmpty') }}
      </p>
    </div>

    <template v-else>
      <template v-if="paragraphParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-highlighted">
              {{ $t('templates.builder.blockParagraph') }}
            </div>
            <PlaybooksTokenInsertMenu
              :tokens="tokens"
              @insert="(token) => insertToken('html', token)"
            />
          </div>
          <UFormField :label="$t('templates.builder.content')">
            <div class="w-full min-h-[80px] overflow-hidden rounded-lg border border-default text-sm">
              <UEditor
                :model-value="paragraphParams.html"
                :ui="{ base: 'px-2 py-1.5 sm:px-2 min-h-[80px] *:my-1 *:first:mt-0 *:last:mb-0' }"
                :image="false"
                :mention="false"
                @update:model-value="(v) => update({ html: String(v) })"
              >
                <template #default="{ editor }">
                  <UEditorToolbar
                    :editor="editor"
                    layout="bubble"
                    :items="[
                      [
                        { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
                        { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' }
                      ],
                      [{ kind: 'link', icon: 'i-lucide-link' }]
                    ]"
                  />
                </template>
              </UEditor>
            </div>
          </UFormField>
        </div>
      </template>

      <template v-else-if="headingParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-highlighted">
              {{ $t('templates.builder.blockHeading') }}
            </div>
            <PlaybooksTokenInsertMenu
              :tokens="tokens"
              @insert="(token) => insertToken('text', token)"
            />
          </div>
          <UFormField :label="$t('templates.builder.content')">
            <UInput
              :model-value="headingParams.text"
              class="w-full"
              @update:model-value="(v) => update({ text: String(v) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.headingLevel')">
            <USelect
              :model-value="headingParams.level"
              :items="levelOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(v) => update({ level: Number(v) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="buttonParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-highlighted">
              {{ $t('templates.builder.blockButton') }}
            </div>
            <PlaybooksTokenInsertMenu
              :tokens="tokens"
              @insert="(token) => insertToken('label', token)"
            />
          </div>
          <UFormField :label="$t('templates.builder.buttonLabel')">
            <UInput
              :model-value="buttonParams.label"
              class="w-full"
              @update:model-value="(v) => update({ label: String(v) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.buttonUrl')">
            <div class="flex gap-2">
              <UInput
                :model-value="buttonParams.url"
                class="w-full"
                @update:model-value="(v) => update({ url: String(v) })"
              />
              <PlaybooksTokenInsertMenu
                :tokens="tokens"
                @insert="(token) => insertToken('url', token)"
              />
            </div>
          </UFormField>
          <UFormField :label="$t('templates.builder.buttonStyle')">
            <USelect
              :model-value="buttonParams.style"
              :items="styleOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(v) => update({ style: String(v) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="imageParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('templates.builder.blockImage') }}
          </div>
          <UFormField :label="$t('templates.builder.uploadImage')">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              class="block w-full text-sm"
              @change="onFileChange"
            >
          </UFormField>
          <UFormField
            v-if="imageParams.url"
            :label="$t('templates.builder.imageUrl')"
          >
            <UInput
              :model-value="imageParams.url ?? ''"
              class="w-full"
              readonly
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.imageAlt')">
            <UInput
              :model-value="imageParams.alt"
              class="w-full"
              @update:model-value="(v) => update({ alt: String(v) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.widthPercent')">
            <UInput
              :model-value="imageParams.width_percent"
              type="number"
              min="1"
              max="100"
              class="w-full"
              @update:model-value="(v) => update({ width_percent: Number(v) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="spacerParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('templates.builder.blockSpacer') }}
          </div>
          <UFormField :label="$t('templates.builder.spacerHeight')">
            <UInput
              :model-value="spacerParams.height"
              type="number"
              min="4"
              max="200"
              class="w-full"
              @update:model-value="(v) => update({ height: Number(v) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="rawHtmlParams">
        <div class="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50/40 p-3">
          <div class="text-xs font-semibold text-amber-900">
            {{ $t('templates.builder.blockRawHtml') }}
          </div>
          <p class="text-xs text-amber-800">
            {{ $t('templates.builder.rawHtmlWarning') }}
          </p>
          <UFormField :label="$t('templates.builder.content')">
            <UTextarea
              :model-value="rawHtmlParams.html"
              :rows="10"
              class="w-full font-mono text-xs"
              @update:model-value="(v) => update({ html: String(v) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="block.type === 'unit_summary'">
        <div class="rounded-lg border border-default p-3 text-xs text-dimmed">
          {{ $t('templates.builder.unitSummaryHint') }}
        </div>
      </template>

      <template v-else-if="block.type === 'divider'">
        <div class="rounded-lg border border-default p-3 text-xs text-dimmed">
          {{ $t('templates.builder.dividerHint') }}
        </div>
      </template>
    </template>
  </div>
</template>
