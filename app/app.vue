<script setup lang="ts">
const { locale } = useI18n()
const auth = useAuthStore()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: locale
  }
})
</script>

<template>
  <UApp>
    <div
      v-if="!auth.initialised"
      class="min-h-screen flex items-center justify-center bg-default"
    >
      <BrandLogo class="h-10 text-highlighted" />
    </div>
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
