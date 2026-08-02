export function useCallRecording() {
  const { downloadBlob } = useApi()
  const loadingId = ref<number | null>(null)
  const objectUrls = new Map<number, string>()

  async function loadRecording(messageId: number): Promise<string> {
    const existing = objectUrls.get(messageId)
    if (existing) {
      return existing
    }

    loadingId.value = messageId
    try {
      const blob = await downloadBlob(`/api/messages/${messageId}/recording`)
      const url = URL.createObjectURL(blob)
      objectUrls.set(messageId, url)
      return url
    } finally {
      loadingId.value = null
    }
  }

  function revoke(messageId: number) {
    const url = objectUrls.get(messageId)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrls.delete(messageId)
    }
  }

  onBeforeUnmount(() => {
    for (const url of objectUrls.values()) {
      URL.revokeObjectURL(url)
    }
    objectUrls.clear()
  })

  return { loadingId, loadRecording, revoke }
}
