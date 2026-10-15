import type {
  CalloutBlockParams,
  EmailDocumentV2,
  FooterSocialBlockParams,
  InfoRowsBlockParams,
  ListBlockParams,
  LogoHeaderBlockParams
} from './email-block-document'

export type TemplateBuilderChannel = 'email' | 'document'

export type {
  CalloutBlockParams,
  EmailColumn,
  EmailDocumentV2,
  EmailLayout,
  EmailPadding,
  EmailSection,
  EmailSectionParams,
  EmailV2Block,
  FooterSocialBlockParams,
  InfoRow,
  InfoRowsBlockParams,
  ListBlockParams,
  LogoHeaderBlockParams,
  SocialLink,
  SocialNetwork
} from './email-block-document'

export type EmailOnlyBlockType
  = | 'button'
    | 'image'
    | 'unit_summary'
    | 'raw_html'
    | 'info_rows'
    | 'list'
    | 'callout'
    | 'logo_header'
    | 'footer_social'

export type DocumentOnlyBlockType
  = | 'legal_section'
    | 'parties'
    | 'terms_table'
    | 'signature_anchor'
    | 'page_break'

export type SharedBlockType
  = | 'heading'
    | 'paragraph'
    | 'divider'
    | 'spacer'

export type BlockType = SharedBlockType | EmailOnlyBlockType | DocumentOnlyBlockType

export type ButtonStyle = 'primary' | 'outline'

export interface HeadingBlockParams {
  text: string
  level: 1 | 2
}

export interface ParagraphBlockParams {
  html: string
}

export interface ButtonBlockParams {
  label: string
  url: string
  style: ButtonStyle
}

export interface ImageBlockParams {
  asset_id?: number | null
  url?: string | null
  alt: string
  width_percent: number
}

export interface SpacerBlockParams {
  height: number
}

export interface RawHtmlBlockParams {
  html: string
}

export interface LegalSectionBlockParams {
  heading: string
  body: string
}

export type BlockParams
  = | HeadingBlockParams
    | ParagraphBlockParams
    | ButtonBlockParams
    | ImageBlockParams
    | Record<string, never>
    | SpacerBlockParams
    | RawHtmlBlockParams
    | LegalSectionBlockParams
    | InfoRowsBlockParams
    | ListBlockParams
    | CalloutBlockParams
    | LogoHeaderBlockParams
    | FooterSocialBlockParams

export interface EmailBlock {
  id: string
  type: BlockType
  params: BlockParams
}

export interface EmailBlockDocument {
  version: 1
  blocks: Array<EmailBlock>
}

export interface ApiTemplateVariant {
  id: number
  template_family_id: number
  locale: string
  subject: string | null
  blocks: EmailBlockDocument | EmailDocumentV2 | null
  legacy_html: string | null
  body_text: string | null
  updated_by: number | null
  created_at: string
  updated_at: string
}

export interface ApiTemplateVersion {
  id: number
  version_number: number
  status?: 'draft' | 'published'
  published_at?: string | null
  published_by?: number | null
  based_on_version_id?: number | null
  locales?: Array<string>
  usage_count?: number
  variants?: Array<ApiTemplateVariant>
}

export interface TemplateToken {
  path: string
  group: string
  type: string
  label: string
  description: string
  sample: string
  available: boolean
}

export interface ApiTemplatePublishWarning {
  variant_id: number
  locale: string
  tokens: Array<string>
}

export interface ApiTemplateFamily {
  id: number
  channel: string
  name: string
  purpose: string
  archived_at: string | null
  locales: Array<string>
  usage_count: number
  current_version: ApiTemplateVersion | null
  draft_version: ApiTemplateVersion | null
  has_unpublished_changes: boolean
  created_at: string
  updated_at: string
}

export function workingVariants(family: ApiTemplateFamily): Array<ApiTemplateVariant> {
  return family.draft_version?.variants ?? family.current_version?.variants ?? []
}

export function variantUsesHtml(variant: ApiTemplateVariant): boolean {
  return typeof variant.legacy_html === 'string' && variant.legacy_html !== ''
}

export type InsertableBlockType = Exclude<BlockType, 'raw_html'>

export type EmailSelection
  = | { kind: 'section', id: string }
    | { kind: 'column', id: string }
    | { kind: 'block', id: string }

export const EMAIL_INSERTABLE_TYPES: Array<InsertableBlockType> = [
  'paragraph',
  'heading',
  'image',
  'button',
  'divider',
  'spacer',
  'info_rows',
  'list',
  'callout',
  'logo_header',
  'footer_social',
  'unit_summary'
]

export const DOCUMENT_INSERTABLE_TYPES: Array<InsertableBlockType> = [
  'heading',
  'paragraph',
  'divider',
  'spacer',
  'legal_section',
  'parties',
  'terms_table',
  'signature_anchor',
  'page_break'
]

export function insertableTypesForChannel(channel: TemplateBuilderChannel): Array<InsertableBlockType> {
  return channel === 'document' ? DOCUMENT_INSERTABLE_TYPES : EMAIL_INSERTABLE_TYPES
}

export function createDefaultBlockParams(
  type: InsertableBlockType,
  meta?: { level?: 1 | 2 }
): BlockParams {
  switch (type) {
    case 'heading':
      return {
        text: meta?.level === 2 ? 'Heading 2' : 'Heading 1',
        level: meta?.level === 2 ? 2 : 1
      } satisfies HeadingBlockParams
    case 'paragraph':
      return { html: '<p>Your text here</p>' } satisfies ParagraphBlockParams
    case 'button':
      return {
        label: 'Click here',
        url: '{{pay_link}}',
        style: 'primary'
      } satisfies ButtonBlockParams
    case 'image':
      return {
        asset_id: null,
        url: null,
        alt: '',
        width_percent: 100
      } satisfies ImageBlockParams
    case 'divider':
      return {}
    case 'spacer':
      return { height: 24 } satisfies SpacerBlockParams
    case 'unit_summary':
      return {}
    case 'legal_section':
      return {
        heading: 'Section heading',
        body: 'Section body…'
      } satisfies LegalSectionBlockParams
    case 'parties':
    case 'terms_table':
    case 'signature_anchor':
    case 'page_break':
      return {}
    case 'info_rows':
      return {
        rows: [{ label: 'Label', value: 'Value' }],
        striped: true,
        value_align: 'right'
      } satisfies InfoRowsBlockParams
    case 'list':
      return {
        style: 'bullet',
        items: ['Item']
      } satisfies ListBlockParams
    case 'callout':
      return {
        tone: 'info',
        title: null,
        html: '<p>Note</p>'
      } satisfies CalloutBlockParams
    case 'logo_header':
      return {
        align: 'center',
        max_width: 160,
        link_url: null
      } satisfies LogoHeaderBlockParams
    case 'footer_social':
      return {
        links: [],
        address: null
      } satisfies FooterSocialBlockParams
  }
}

export function hydrateVariantDocument(variant: ApiTemplateVariant): EmailBlockDocument {
  if (variant.blocks && variant.blocks.version === 1 && Array.isArray(variant.blocks.blocks)) {
    return {
      version: 1,
      blocks: variant.blocks.blocks.map(block => ({
        id: String(block.id),
        type: block.type,
        params: block.params ?? {}
      }))
    }
  }

  if (variant.legacy_html) {
    return {
      version: 1,
      blocks: [{
        id: 'legacy-raw',
        type: 'raw_html',
        params: { html: variant.legacy_html } satisfies RawHtmlBlockParams
      }]
    }
  }

  return { version: 1, blocks: [] }
}

export function blockLabelKey(type: string, params?: { level?: number }): string {
  if (type === 'heading') {
    return params?.level === 2 ? 'templates.builder.blockH2' : 'templates.builder.blockH1'
  }
  const labels: Record<string, string> = {
    paragraph: 'templates.builder.blockParagraph',
    image: 'templates.builder.blockImage',
    button: 'templates.builder.blockButton',
    divider: 'templates.builder.blockDivider',
    spacer: 'templates.builder.blockSpacer',
    unit_summary: 'templates.builder.blockUnitSummary',
    raw_html: 'templates.builder.blockRawHtml',
    legal_section: 'templates.builder.blockLegalSection',
    parties: 'templates.builder.blockParties',
    terms_table: 'templates.builder.blockTermsTable',
    signature_anchor: 'templates.builder.blockSignatureAnchor',
    page_break: 'templates.builder.blockPageBreak',
    info_rows: 'templates.builder.blockInfoRows',
    list: 'templates.builder.blockList',
    callout: 'templates.builder.blockCallout',
    logo_header: 'templates.builder.blockLogoHeader',
    footer_social: 'templates.builder.blockFooterSocial'
  }
  return labels[type] ?? 'templates.builder.blockParagraph'
}
