export type BlockType = 'text' | 'heading' | 'image' | 'button' | 'divider' | 'spacer'

export type TextAlign = 'left' | 'center' | 'right'

export interface TextBlockProps {
  content: string
  align: TextAlign
  fontSize: number
  color: string
}

export interface HeadingBlockProps {
  content: string
  align: TextAlign
  color: string
  level: 1 | 2 | 3
}

export interface ImageBlockProps {
  src: string
  alt: string
  width: number
  align: TextAlign
}

export interface ButtonBlockProps {
  label: string
  href: string
  backgroundColor: string
  textColor: string
  align: TextAlign
}

export interface DividerBlockProps {
  color: string
  thickness: number
}

export interface SpacerBlockProps {
  height: number
}

export type BlockProps = TextBlockProps
  | HeadingBlockProps
  | ImageBlockProps
  | ButtonBlockProps
  | DividerBlockProps
  | SpacerBlockProps

export interface EmailBlock {
  id: number | string
  type: BlockType
  props: BlockProps
}

export interface ApiEmailTemplate {
  id: number
  name: string
  blocks: Array<EmailBlock>
  created_at: string
  updated_at: string
}

export function createDefaultBlockProps(type: BlockType, meta?: { level?: 1 | 2 | 3 }): BlockProps {
  switch (type) {
    case 'text':
      return { content: 'Your text here', align: 'left', fontSize: 16, color: '#000000' } satisfies TextBlockProps
    case 'heading': {
      const level = meta?.level ?? 1
      const content = level === 1 ? 'Heading 1' : level === 2 ? 'Heading 2' : 'Heading 3'
      return { content, align: 'left', color: '#111827', level } satisfies HeadingBlockProps
    }
    case 'image':
      return { src: '', alt: '', width: 600, align: 'center' } satisfies ImageBlockProps
    case 'button':
      return { label: 'Click here', href: '#', backgroundColor: '#3b82f6', textColor: '#ffffff', align: 'center' } satisfies ButtonBlockProps
    case 'divider':
      return { color: '#e5e7eb', thickness: 1 } satisfies DividerBlockProps
    case 'spacer':
      return { height: 24 } satisfies SpacerBlockProps
  }
}
