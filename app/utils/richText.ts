const EDITOR_TAG = /<(?:p|h[1-3]|strong|em|b|i|a|ul|ol|li|br)\b/i

/** TipTap emits `<p></p>` for an empty document, so string trim is not enough. */
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) {
    return ''
  }

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

export function isRichTextEmpty(html: string | null | undefined): boolean {
  return richTextToPlain(html).length === 0
}

export function richTextOrNull(html: string | null | undefined): string | null {
  if (isRichTextEmpty(html)) {
    return null
  }

  return html!.trim()
}

export function looksLikeRichText(html: string | null | undefined): boolean {
  if (!html) {
    return false
  }

  return EDITOR_TAG.test(html)
}
