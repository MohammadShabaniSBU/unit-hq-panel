export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  remainingMs: number
  expired: boolean
}

const EMPTY: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  remainingMs: 0,
  expired: true
}

/**
 * Live remaining-time breakdown against an ISO timestamp.
 * Expiry is read-time (invariant 13) — the clock is client-side only.
 */
export function useCountdown(expiresAt: MaybeRefOrGetter<string | null | undefined>) {
  const nowTick = ref(Date.now())
  let tickTimer: ReturnType<typeof setInterval> | null = null

  const parts = computed<CountdownParts>(() => {
    const iso = toValue(expiresAt)
    if (!iso) {
      return EMPTY
    }

    const remainingMs = new Date(iso).getTime() - nowTick.value
    if (Number.isNaN(remainingMs) || remainingMs <= 0) {
      return EMPTY
    }

    const totalSeconds = Math.floor(remainingMs / 1000)

    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      remainingMs,
      expired: false
    }
  })

  function startTick() {
    stopTick()
    nowTick.value = Date.now()
    tickTimer = setInterval(() => {
      nowTick.value = Date.now()
    }, 1000)
  }

  function stopTick() {
    if (tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }

  onMounted(startTick)
  onBeforeUnmount(stopTick)

  return {
    parts,
    nowTick
  }
}
