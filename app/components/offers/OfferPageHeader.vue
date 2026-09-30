<script setup lang="ts">
defineProps<{
  phone?: string | null
}>()

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}
</script>

<template>
  <header class="flex items-center justify-between gap-4">
    <BrandLogo class="h-8 text-highlighted sm:h-10" />

    <a
      v-if="phone"
      :href="telHref(phone)"
      class="flex items-center gap-2 text-sm text-muted transition-colors hover:text-highlighted"
    >
      <UIcon
        name="i-lucide-phone"
        class="size-4 shrink-0"
      />
      <span class="hidden sm:inline">{{ $t('pages.offerPreview.needHelp') }}</span>
      <span class="font-semibold text-highlighted">{{ phone }}</span>
    </a>
  </header>
</template>
