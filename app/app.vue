<script setup lang="ts">
const { locale, t } = useI18n()
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
      <div class="flex items-center gap-2.5">
        <div class="flex size-9 items-center justify-center rounded-md bg-primary text-white">
          <UIcon
            name="i-lucide-box"
            class="size-5"
          />
        </div>
        <span class="text-lg font-semibold text-highlighted">
          {{ t('sidebar.brand') }}
        </span>
      </div>
    </div>
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
