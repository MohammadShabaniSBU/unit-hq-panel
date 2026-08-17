export type CopilotTurnEvent
  = { type: 'started' }
    | { type: 'text', delta: string }
    | { type: 'paused_for_approval', text: string }
    | { type: 'settled', text: string }
    | { type: 'failed', errorKey: string }

type Listener = (e: CopilotTurnEvent) => void
const listeners = new Set<Listener>()

export function onCopilotTurn(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emitCopilotTurn(e: CopilotTurnEvent): void {
  for (const fn of listeners) fn(e)
}
