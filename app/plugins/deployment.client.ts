export default defineNuxtPlugin({
  dependsOn: ['i18n:plugin'],
  setup() {
    const auth = useAuthStore()
    const deployment = useDeploymentStore()
    const { $i18n } = useNuxtApp()
    const preference = useCookie<string | null>('i18n_redirected')

    watch(
      () => auth.token,
      async (token) => {
        if (!token) {
          return
        }

        await deployment.load()

        if (!preference.value && deployment.defaultLocale) {
          await $i18n.setLocale(deployment.defaultLocale)
        }
      },
      { immediate: true }
    )
  }
})
