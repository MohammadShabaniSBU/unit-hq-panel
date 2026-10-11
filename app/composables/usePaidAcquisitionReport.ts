const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function queryDate(value: unknown): string | undefined {
  return typeof value === 'string' && ISO_DATE.test(value) ? value : undefined
}

export function usePaidAcquisitionReport() {
  const route = useRoute()
  const router = useRouter()

  const from = computed(() => queryDate(route.query.from))
  const to = computed(() => queryDate(route.query.to))

  function periodQuery(): Record<string, string> {
    const query: Record<string, string> = {}
    if (from.value) {
      query.from = from.value
    }
    if (to.value) {
      query.to = to.value
    }
    return query
  }

  async function setPeriod(nextFrom: string | undefined, nextTo: string | undefined) {
    const query: Record<string, string | Array<string>> = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (key === 'from' || key === 'to' || value == null) {
        continue
      }
      if (typeof value === 'string') {
        query[key] = value
      } else if (Array.isArray(value)) {
        query[key] = value.filter((item): item is string => typeof item === 'string')
      }
    }
    if (nextFrom) {
      query.from = nextFrom
    }
    if (nextTo) {
      query.to = nextTo
    }
    await router.replace({ query })
  }

  return {
    from,
    to,
    periodQuery,
    setPeriod
  }
}
