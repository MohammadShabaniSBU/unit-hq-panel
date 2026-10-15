<script setup lang="ts">
import type {
  EmailBlock,
  ParagraphBlockParams,
  HeadingBlockParams,
  ImageBlockParams,
  ButtonBlockParams,
  SpacerBlockParams,
  RawHtmlBlockParams,
  LegalSectionBlockParams,
  InfoRowsBlockParams,
  ListBlockParams,
  CalloutBlockParams,
  LogoHeaderBlockParams,
  FooterSocialBlockParams,
  SocialNetwork
} from '~/types/email-builder'

const props = withDefaults(defineProps<{
  block: EmailBlock | null
  familyId: string
  purpose: string
  readonly?: boolean
  position?: { current: number, total: number } | null
}>(), {
  readonly: false,
  position: null
})

const emit = defineEmits<{
  'update:block': [block: EmailBlock]
  'upload-image': [file: File]
}>()

const { tokens } = useTemplateTokens(() => props.familyId)

function update(partial: Record<string, unknown>) {
  if (!props.block || props.readonly) return
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
const legalSectionParams = computed(() =>
  props.block?.type === 'legal_section' ? props.block.params as LegalSectionBlockParams : null
)
const infoRowsParams = computed(() =>
  props.block?.type === 'info_rows' ? props.block.params as InfoRowsBlockParams : null
)
const listParams = computed(() =>
  props.block?.type === 'list' ? props.block.params as ListBlockParams : null
)
const calloutParams = computed(() =>
  props.block?.type === 'callout' ? props.block.params as CalloutBlockParams : null
)
const logoHeaderParams = computed(() =>
  props.block?.type === 'logo_header' ? props.block.params as LogoHeaderBlockParams : null
)
const footerSocialParams = computed(() =>
  props.block?.type === 'footer_social' ? props.block.params as FooterSocialBlockParams : null
)

const networks: Array<SocialNetwork> = ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'website']

const { t } = useI18n()

const networkOptions = computed(() => networks.map(network => ({
  label: t(`templates.builder.social.${network}`),
  value: network
})))

const alignOptions = computed(() => [
  { label: t('templates.builder.alignLeft'), value: 'left' },
  { label: t('templates.builder.alignRight'), value: 'right' }
])

const logoAlignOptions = computed(() => [
  { label: t('templates.builder.alignLeft'), value: 'left' },
  { label: t('templates.builder.alignCenter'), value: 'center' }
])

const listStyleOptions = computed(() => [
  { label: t('templates.builder.listBullet'), value: 'bullet' },
  { label: t('templates.builder.listNumbered'), value: 'numbered' }
])

const toneOptions = computed(() => [
  { label: t('templates.builder.toneInfo'), value: 'info' },
  { label: t('templates.builder.toneWarning'), value: 'warning' },
  { label: t('templates.builder.toneDanger'), value: 'danger' }
])

const styleOptions = computed(() => [
  { label: 'Primary', value: 'primary' },
  { label: 'Outline', value: 'outline' }
])

const levelOptions = [
  { label: 'H1', value: 1 },
  { label: 'H2', value: 2 }
]

const blockMeta = computed(() => {
  const block = props.block
  if (!block) return null
  if (block.type === 'heading') {
    const level = (block.params as HeadingBlockParams).level
    return {
      icon: level === 2 ? 'i-lucide-heading-2' : 'i-lucide-heading-1',
      label: level === 2 ? 'templates.builder.blockH2' : 'templates.builder.blockH1'
    }
  }
  const meta: Record<string, { icon: string, label: string }> = {
    paragraph: { icon: 'i-lucide-type', label: 'templates.builder.blockParagraph' },
    image: { icon: 'i-lucide-image', label: 'templates.builder.blockImage' },
    button: { icon: 'i-lucide-square-mouse-pointer', label: 'templates.builder.blockButton' },
    divider: { icon: 'i-lucide-minus', label: 'templates.builder.blockDivider' },
    spacer: { icon: 'i-lucide-arrow-up-down', label: 'templates.builder.blockSpacer' },
    unit_summary: { icon: 'i-lucide-warehouse', label: 'templates.builder.blockUnitSummary' },
    raw_html: { icon: 'i-lucide-code', label: 'templates.builder.blockRawHtml' },
    legal_section: { icon: 'i-lucide-scale', label: 'templates.builder.blockLegalSection' },
    parties: { icon: 'i-lucide-users', label: 'templates.builder.blockParties' },
    terms_table: { icon: 'i-lucide-table', label: 'templates.builder.blockTermsTable' },
    signature_anchor: { icon: 'i-lucide-pen-line', label: 'templates.builder.blockSignatureAnchor' },
    page_break: { icon: 'i-lucide-separator-horizontal', label: 'templates.builder.blockPageBreak' },
    info_rows: { icon: 'i-lucide-table-rows', label: 'templates.builder.blockInfoRows' },
    list: { icon: 'i-lucide-list', label: 'templates.builder.blockList' },
    callout: { icon: 'i-lucide-megaphone', label: 'templates.builder.blockCallout' },
    logo_header: { icon: 'i-lucide-badge', label: 'templates.builder.blockLogoHeader' },
    footer_social: { icon: 'i-lucide-share-2', label: 'templates.builder.blockFooterSocial' }
  }
  return meta[block.type] ?? null
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && !props.readonly) emit('upload-image', file)
  input.value = ''
}

function updateInfoRow(index: number, partial: { label?: string, value?: string }) {
  if (!infoRowsParams.value) return
  const rows = infoRowsParams.value.rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...partial } : row
  )
  update({ rows })
}

function updateListItem(index: number, value: string) {
  if (!listParams.value) return
  const items = listParams.value.items.map((item, itemIndex) => itemIndex === index ? value : item)
  update({ items })
}

function updateSocialLink(index: number, partial: { network?: SocialNetwork, url?: string }) {
  if (!footerSocialParams.value) return
  const links = footerSocialParams.value.links.map((link, linkIndex) =>
    linkIndex === index ? { ...link, ...partial } : link
  )
  update({ links })
}

function insertCalloutToken(token: string) {
  if (!calloutParams.value) return
  update({ html: `${calloutParams.value.html}${token}` })
}

function insertLogoLinkToken(token: string) {
  if (!logoHeaderParams.value) return
  update({ link_url: `${logoHeaderParams.value.link_url ?? ''}${token}` })
}

function removeSocialLink(index: number) {
  if (!footerSocialParams.value) return
  update({ links: footerSocialParams.value.links.filter((_, linkIndex) => linkIndex !== index) })
}

function insertFooterAddressToken(token: string) {
  if (!footerSocialParams.value) return
  update({ address: `${footerSocialParams.value.address ?? ''}${token}` })
}
</script>

<template>
  <div
    class="flex flex-col gap-1"
    :class="readonly ? 'pointer-events-none' : ''"
  >
    <div class="mb-3 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('templates.builder.settings') }}
    </div>

    <div
      v-if="block && blockMeta"
      class="mb-3 flex items-center gap-2"
    >
      <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-highlighted">
        <UIcon
          :name="blockMeta.icon"
          class="size-4"
        />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-highlighted">
          {{ $t(blockMeta.label) }}
        </p>
        <p
          v-if="position"
          class="text-xs text-dimmed"
        >
          {{ $t('templates.builder.blockOf', { current: position.current, total: position.total }) }}
        </p>
      </div>
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
            <EmailBuilderTokenInsertMenu
              v-if="!readonly"
              :tokens="tokens"
              :purpose="purpose"
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
            <EmailBuilderTokenInsertMenu
              v-if="!readonly"
              :tokens="tokens"
              :purpose="purpose"
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
            <EmailBuilderTokenInsertMenu
              v-if="!readonly"
              :tokens="tokens"
              :purpose="purpose"
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
              <EmailBuilderTokenInsertMenu
                v-if="!readonly"
                :tokens="tokens"
                :purpose="purpose"
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

      <template v-else-if="legalSectionParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-highlighted">
              {{ $t('templates.builder.blockLegalSection') }}
            </div>
            <EmailBuilderTokenInsertMenu
              v-if="!readonly"
              :tokens="tokens"
              :purpose="purpose"
              @insert="(token) => insertToken('body', token)"
            />
          </div>
          <UFormField :label="$t('templates.builder.sectionHeading')">
            <UInput
              :model-value="legalSectionParams.heading"
              class="w-full"
              @update:model-value="(v) => update({ heading: String(v) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.sectionBody')">
            <UTextarea
              :model-value="legalSectionParams.body"
              :rows="8"
              class="w-full"
              @update:model-value="(v) => update({ body: String(v) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="infoRowsParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('templates.builder.blockInfoRows') }}
          </div>
          <div
            v-for="(row, index) in infoRowsParams.rows"
            :key="index"
            class="flex flex-col gap-2 rounded-md border border-default p-2"
          >
            <UFormField :label="$t('templates.builder.rowLabel')">
              <UInput
                :model-value="row.label"
                class="w-full"
                @update:model-value="(value) => updateInfoRow(index, { label: String(value) })"
              />
            </UFormField>
            <UFormField :label="$t('templates.builder.rowValue')">
              <div class="flex gap-2">
                <UInput
                  :model-value="row.value"
                  class="w-full"
                  @update:model-value="(value) => updateInfoRow(index, { value: String(value) })"
                />
                <EmailBuilderTokenInsertMenu
                  v-if="!readonly"
                  :tokens="tokens"
                  :purpose="purpose"
                  @insert="(token) => updateInfoRow(index, { value: `${row.value}${token}` })"
                />
              </div>
            </UFormField>
            <UButton
              v-if="infoRowsParams.rows.length > 1"
              size="xs"
              color="neutral"
              variant="ghost"
              :label="$t('templates.builder.removeRow')"
              @click="update({ rows: infoRowsParams.rows.filter((_, rowIndex) => rowIndex !== index) })"
            />
          </div>
          <UButton
            v-if="infoRowsParams.rows.length < 12"
            size="xs"
            color="neutral"
            variant="outline"
            :label="$t('templates.builder.addRow')"
            @click="update({ rows: [...infoRowsParams.rows, { label: 'Label', value: 'Value' }] })"
          />
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm">{{ $t('templates.builder.infoRowsStriped') }}</span>
            <USwitch
              :model-value="infoRowsParams.striped"
              @update:model-value="(value) => update({ striped: Boolean(value) })"
            />
          </div>
          <UFormField :label="$t('templates.builder.valueAlign')">
            <USelect
              :model-value="infoRowsParams.value_align"
              :items="alignOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(value) => update({ value_align: String(value) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="listParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('templates.builder.blockList') }}
          </div>
          <UFormField :label="$t('templates.builder.listStyle')">
            <USelect
              :model-value="listParams.style"
              :items="listStyleOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(value) => update({ style: String(value) })"
            />
          </UFormField>
          <UFormField
            v-for="(item, index) in listParams.items"
            :key="index"
            :label="$t('templates.builder.listItem')"
          >
            <div class="flex gap-2">
              <UInput
                :model-value="item"
                class="w-full"
                @update:model-value="(value) => updateListItem(index, String(value))"
              />
              <UButton
                v-if="listParams.items.length > 1"
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                :aria-label="$t('templates.builder.removeRow')"
                @click="update({ items: listParams.items.filter((_, itemIndex) => itemIndex !== index) })"
              />
            </div>
          </UFormField>
          <UButton
            v-if="listParams.items.length < 20"
            size="xs"
            color="neutral"
            variant="outline"
            :label="$t('templates.builder.addItem')"
            @click="update({ items: [...listParams.items, 'Item'] })"
          />
        </div>
      </template>

      <template v-else-if="calloutParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-highlighted">
              {{ $t('templates.builder.blockCallout') }}
            </div>
            <EmailBuilderTokenInsertMenu
              v-if="!readonly"
              :tokens="tokens"
              :purpose="purpose"
              @insert="insertCalloutToken"
            />
          </div>
          <UFormField :label="$t('templates.builder.calloutTone')">
            <USelect
              :model-value="calloutParams.tone"
              :items="toneOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(value) => update({ tone: String(value) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.calloutTitle')">
            <UInput
              :model-value="calloutParams.title ?? ''"
              class="w-full"
              @update:model-value="(value) => update({ title: String(value) === '' ? null : String(value) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.content')">
            <UTextarea
              :model-value="calloutParams.html"
              :rows="5"
              class="w-full"
              @update:model-value="(value) => update({ html: String(value) })"
            />
          </UFormField>
        </div>
      </template>

      <template v-else-if="logoHeaderParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('templates.builder.blockLogoHeader') }}
          </div>
          <UFormField :label="$t('templates.builder.logoAlign')">
            <USelect
              :model-value="logoHeaderParams.align"
              :items="logoAlignOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(value) => update({ align: String(value) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.logoMaxWidth')">
            <UInput
              :model-value="logoHeaderParams.max_width"
              type="number"
              min="60"
              max="300"
              class="w-full"
              @update:model-value="(value) => update({ max_width: Number(value) })"
            />
          </UFormField>
          <UFormField :label="$t('templates.builder.logoLink')">
            <div class="flex gap-2">
              <UInput
                :model-value="logoHeaderParams.link_url ?? ''"
                class="w-full"
                @update:model-value="(value) => update({ link_url: String(value) === '' ? null : String(value) })"
              />
              <EmailBuilderTokenInsertMenu
                v-if="!readonly"
                :tokens="tokens"
                :purpose="purpose"
                @insert="insertLogoLinkToken"
              />
            </div>
          </UFormField>
        </div>
      </template>

      <template v-else-if="footerSocialParams">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('templates.builder.blockFooterSocial') }}
          </div>
          <div
            v-for="(link, index) in footerSocialParams.links"
            :key="index"
            class="flex flex-col gap-2 rounded-md border border-default p-2"
          >
            <UFormField :label="$t('templates.builder.socialNetwork')">
              <USelect
                :model-value="link.network"
                :items="networkOptions"
                value-key="value"
                class="w-full"
                @update:model-value="(value) => updateSocialLink(index, { network: String(value) as SocialNetwork })"
              />
            </UFormField>
            <UFormField :label="$t('templates.builder.socialUrl')">
              <UInput
                :model-value="link.url"
                class="w-full"
                @update:model-value="(value) => updateSocialLink(index, { url: String(value) })"
              />
            </UFormField>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :label="$t('templates.builder.removeRow')"
              @click="removeSocialLink(index)"
            />
          </div>
          <UButton
            v-if="footerSocialParams.links.length < 6"
            size="xs"
            color="neutral"
            variant="outline"
            :label="$t('templates.builder.addLink')"
            @click="update({ links: [...footerSocialParams.links, { network: 'website', url: 'https://' }] })"
          />
          <UFormField :label="$t('templates.builder.footerAddress')">
            <div class="flex gap-2">
              <UTextarea
                :model-value="footerSocialParams.address ?? ''"
                :rows="3"
                class="w-full"
                @update:model-value="(value) => update({ address: String(value) === '' ? null : String(value) })"
              />
              <EmailBuilderTokenInsertMenu
                v-if="!readonly"
                :tokens="tokens"
                :purpose="purpose"
                @insert="insertFooterAddressToken"
              />
            </div>
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

      <template v-else-if="block.type === 'parties'">
        <div class="rounded-lg border border-default p-3 text-xs text-dimmed">
          {{ $t('templates.builder.blockPartiesDesc') }}
        </div>
      </template>

      <template v-else-if="block.type === 'terms_table'">
        <div class="rounded-lg border border-default p-3 text-xs text-dimmed">
          {{ $t('templates.builder.blockTermsTableDesc') }}
        </div>
      </template>

      <template v-else-if="block.type === 'signature_anchor'">
        <div class="rounded-lg border border-default p-3 text-xs text-dimmed">
          {{ $t('templates.builder.blockSignatureAnchorDesc') }}
        </div>
      </template>

      <template v-else-if="block.type === 'page_break'">
        <div class="rounded-lg border border-default p-3 text-xs text-dimmed">
          {{ $t('templates.builder.blockPageBreakDesc') }}
        </div>
      </template>
    </template>
  </div>
</template>
