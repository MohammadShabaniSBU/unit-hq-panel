<script setup lang="ts">
const props = defineProps<{
  phone?: string | null
  email?: string | null
}>()

const hasContact = computed(() => !!props.phone || !!props.email)

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

const linkClass = 'inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10'
</script>

<template>
  <section
    v-if="hasContact"
    class="flex flex-col gap-4 rounded-3xl bg-neutral-900 p-6 text-white @2xl:flex-row @2xl:items-center @2xl:justify-between sm:p-8 dark:bg-neutral-800"
  >
    <div class="max-w-xl">
      <h2 class="text-lg font-bold">
        {{ $t('pages.offerPreview.contactTitle') }}
      </h2>
      <p class="mt-1 text-sm text-white/70">
        {{ $t('pages.offerPreview.contactBody') }}
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <a
        v-if="phone"
        :href="telHref(phone)"
        :class="linkClass"
      >
        <UIcon
          name="i-lucide-phone"
          class="size-4 shrink-0"
        />
        {{ phone }}
      </a>
      <a
        v-if="email"
        :href="`mailto:${email}`"
        :class="linkClass"
      >
        <UIcon
          name="i-lucide-mail"
          class="size-4 shrink-0"
        />
        {{ email }}
      </a>
    </div>
  </section>
</template>
