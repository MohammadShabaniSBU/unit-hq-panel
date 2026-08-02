import type { InboxChannel } from '~/types/inbox'

/**
 * Per-tab unread dots on the channel tabs. The main list is already filtered to
 * one channel at a time, so this is a light side query per channel rather than
 * something derivable from the visible page.
 */
export function useInboxChannelDots() {
  const { getCursor } = useApi()
  const dots = ref<Record<InboxChannel, boolean>>({ email: false, sms: false, call: false })

  async function refresh() {
    const channels: Array<InboxChannel> = ['email', 'sms', 'call']

    const results = await Promise.all(
      channels.map(channel =>
        getCursor('/api/inbox/threads', { channel, unread: 1, per_page: 1 })
          .then(response => response.data.length > 0)
          .catch(() => false)
      )
    )

    dots.value = {
      email: results[0] ?? false,
      sms: results[1] ?? false,
      call: results[2] ?? false
    }
  }

  return { dots, refresh }
}
