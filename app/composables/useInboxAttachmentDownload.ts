export function useInboxAttachmentDownload() {
  const { downloadBlob } = useApi()
  const downloadingId = ref<number | null>(null)

  async function download(attachmentId: number, filename: string) {
    if (!import.meta.client) {
      return
    }

    downloadingId.value = attachmentId
    try {
      const blob = await downloadBlob(`/api/message-attachments/${attachmentId}/download`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      downloadingId.value = null
    }
  }

  return { downloadingId, download }
}
