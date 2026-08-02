import type { ApiCallWrapup, CallDisposition } from '~/types/inbox'

const DISPOSITIONS: Array<CallDisposition> = [
  'reached',
  'voicemail_left',
  'no_answer',
  'wrong_number',
  'payment_promised',
  'callback_requested',
  'resolved',
  'other'
]

export function useCallWrapup() {
  const { put } = useApi()

  async function saveWrapup(
    messageId: number,
    payload: { disposition?: CallDisposition | null, note?: string | null }
  ): Promise<ApiCallWrapup> {
    const response = await put<ApiCallWrapup>(`/api/messages/${messageId}/wrapup`, payload)
    return response.data
  }

  async function dismissWrapup(messageId: number): Promise<ApiCallWrapup> {
    return saveWrapup(messageId, { disposition: null, note: null })
  }

  return {
    dispositions: DISPOSITIONS,
    saveWrapup,
    dismissWrapup
  }
}
