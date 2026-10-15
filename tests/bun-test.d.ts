declare module 'bun:test' {
  interface Matcher {
    toBe: (expected: unknown) => void
    toEqual: (expected: unknown) => void
    toBeGreaterThan: (expected: number) => void
    toHaveLength: (expected: number) => void
  }

  export function describe(name: string, fn: () => void): void
  export function it(name: string, fn: () => void | Promise<void>): void
  export function expect(actual: unknown): Matcher
}
