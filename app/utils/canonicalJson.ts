/**
 * Stable JSON for template-assist hashes.
 * Key order is sorted. Arrays keep their order. Whitespace is omitted.
 * Matches App\Support\Templates\Assist\CanonicalDocument (JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).
 */

function compareKeys(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sortValue(item))
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort(compareKeys)) {
      const child = record[key]
      if (child === undefined) continue
      sorted[key] = sortValue(child)
    }
    return sorted
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

export async function canonicalHash(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(canonicalJson(value))
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
