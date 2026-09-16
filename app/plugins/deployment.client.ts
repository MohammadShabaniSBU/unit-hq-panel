export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const deployment = useDeploymentStore()
  const { locale } = useI18n()
  const preference = useCookie<string | null>('i18n_redirected')

  watch(
    () => auth.token,
    async (token) => {
      if (!token) {
        return
      }

      await deployment.load()

      if (!preference.value && deployment.defaultLocale) {
        locale.value = deployment.defaultLocale
      }
    },
    { immediate: true }
  )
})
