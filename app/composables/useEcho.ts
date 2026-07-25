import type Echo from 'laravel-echo'

export function useEcho() {
  const { $echo } = useNuxtApp()
  return $echo as Echo<'reverb'>
}
