export type TemplateBuilderChannel = 'email' | 'document'

export type EmailOnlyBlockType =
  | 'button'
  | 'image'
  | 'unit_summary'
  | 'raw_html'

export type DocumentOnlyBlockType =
  | 'legal_section'
  | 'parties'
  | 'terms_table'
  | 'signature_anchor'
  | 'page_break'

export type SharedBlockType =
  | 'heading'
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

export type BlockParams =
  | HeadingBlockParams
  | ParagraphBlockParams
  | ButtonBlockParams
  | ImageBlockParams
  | Record<string, never>
  | SpacerBlockParams
  | RawHtmlBlockParams
  | LegalSectionBlockParams

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
  blocks: EmailBlockDocument | null
  legacy_html: string | null
  body_text: string | null
  updated_by: number | null
  created_at: string
  updated_at: string
}

export interface ApiTemplateFamily {
  id: number
  channel: string
  name: string
  purpose: string
  archived_at: string | null
  locales: Array<string>
  usage_count: number
  variants: Array<ApiTemplateVariant>
  created_at: string
  updated_at: string
}

export type InsertableBlockType = Exclude<BlockType, 'raw_html'>

export const EMAIL_INSERTABLE_TYPES: Array<InsertableBlockType> = [
  'paragraph',
  'heading',
  'image',
  'button',
  'divider',
  'spacer',
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
