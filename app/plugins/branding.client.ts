export default defineNuxtPlugin(() => {
  const branding = useBrandingStore()
  void branding.load()
})
