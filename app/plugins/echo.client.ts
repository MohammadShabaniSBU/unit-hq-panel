import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { token } = useAuth()

  window.Pusher = Pusher

  const echo = new Echo({
    broadcaster: 'reverb',
    key: config.public.reverbAppKey,
    wsHost: config.public.reverbHost,
    wsPort: Number(config.public.reverbPort),
    wssPort: Number(config.public.reverbPort),
    forceTLS: config.public.reverbScheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${config.public.apiBaseUrl}/broadcasting/auth`,
    authorizer: (channel: { name: string }) => ({
      authorize: (
        socketId: string,
        callback: (error: Error | null, data: { auth: string } | null) => void
      ) => {
        const currentToken = token.value
        if (!currentToken) {
          callback(new Error('Not authenticated'), null)
          return
        }

        $fetch<{ auth: string }>(`${config.public.apiBaseUrl}/broadcasting/auth`, {
          method: 'POST',
          body: {
            socket_id: socketId,
            channel_name: channel.name
          },
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        })
          .then(data => callback(null, data))
          .catch((error: Error) => callback(error, null))
      }
    })
  })

  return {
    provide: {
      echo
    }
  }
})
