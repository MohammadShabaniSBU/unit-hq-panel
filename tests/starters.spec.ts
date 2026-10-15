import { describe, expect, it } from 'bun:test'
import { starterKeysForPurpose } from '../app/utils/assistStarters'

const PURPOSES = [
  'system',
  'general',
  'debt',
  'lead',
  'offer',
  'marketing',
  'newsletter',
  'announcement',
  'contract'
]

describe('starters', () => {
  it('purpose_mapping', () => {
    for (const purpose of PURPOSES) {
      const keys = starterKeysForPurpose(purpose)
      expect(keys.length).toBeGreaterThan(0)
      expect(new Set(keys).size).toBe(keys.length)
    }

    expect(starterKeysForPurpose('general')).toEqual(starterKeysForPurpose('system'))
    expect(starterKeysForPurpose('newsletter')).toEqual(starterKeysForPurpose('marketing'))
    expect(starterKeysForPurpose('contract')).toEqual(starterKeysForPurpose('system'))
    expect(starterKeysForPurpose('unknown')).toEqual(starterKeysForPurpose('system'))
    expect(starterKeysForPurpose('system')).toHaveLength(4)
    expect(starterKeysForPurpose('debt')).toHaveLength(3)
    expect(starterKeysForPurpose('lead')).toHaveLength(2)
    expect(starterKeysForPurpose('offer')).toHaveLength(1)
    expect(starterKeysForPurpose('marketing')).toHaveLength(2)
    expect(starterKeysForPurpose('announcement')).toHaveLength(2)
  })
})
