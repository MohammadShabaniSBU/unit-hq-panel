export default defineNuxtPlugin(() => {
  const auth = useAuthStore()

  void (async () => {
    auth.beginSessionResolve()
    try {
      if (auth.token) {
        await auth.fetchUser()
      }
    } finally {
      auth.endSessionResolve()
      auth.markInitialised()
    }
  })()
})
