export interface UnitCsvRowError {
  row: number
  message: string
}

export function useUnitCsv(onImported: () => void) {
  const { downloadBlob, upload } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const exporting = ref(false)
  const importing = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)

  async function exportCsv() {
    if (!import.meta.client) {
      return
    }

    exporting.value = true
    try {
      const blob = await downloadBlob('/api/units/export')
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = 'units.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.add({
        title: t('pages.units.exportError'),
        color: 'error'
      })
    } finally {
      exporting.value = false
    }
  }

  function openImport() {
    fileInput.value?.click()
  }

  async function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''

    if (!file) {
      return
    }

    importing.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await upload<{ created: number, updated: number }>(
        '/api/units/import',
        formData
      )

      toast.add({
        title: t('pages.units.importSuccess', {
          created: response.data.created,
          updated: response.data.updated
        }),
        color: 'success'
      })
      onImported()
    } catch (err: unknown) {
      const body = err as {
        data?: {
          message?: string
          data?: {
            errors?: Array<UnitCsvRowError>
          }
        }
      }
      const errors = body.data?.data?.errors ?? []
      const description = errors.length > 0
        ? errors
          .slice(0, 3)
          .map(error => t('pages.units.importRowError', {
            row: error.row,
            message: error.message
          }))
          .join('\n')
        : body.data?.message

      toast.add({
        title: t('pages.units.importError'),
        description,
        color: 'error'
      })
    } finally {
      importing.value = false
    }
  }

  return {
    exporting,
    importing,
    fileInput,
    exportCsv,
    openImport,
    onFileChange
  }
}
