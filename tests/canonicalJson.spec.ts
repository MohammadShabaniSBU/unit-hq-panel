import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'bun:test'
import { canonicalHash } from '../app/utils/canonicalJson'

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/template-assist')

interface HashFile {
  [file: string]: {
    base_document: string
    working_document: string
  }
}

describe('canonicalJson', () => {
  it('matches_php_hash', async () => {
    const hashes = JSON.parse(readFileSync(resolve(root, 'hashes.json'), 'utf8')) as HashFile
    for (const [file, expected] of Object.entries(hashes)) {
      const fixture = JSON.parse(readFileSync(resolve(root, 'turns', file), 'utf8')) as {
        base_document: unknown
        working_document: unknown
      }
      expect(await canonicalHash(fixture.base_document)).toBe(expected.base_document)
      expect(await canonicalHash(fixture.working_document)).toBe(expected.working_document)
    }
  })
})
