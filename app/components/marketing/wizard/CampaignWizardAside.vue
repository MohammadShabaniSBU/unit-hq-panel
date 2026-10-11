<script setup lang="ts">
defineProps<{
  eyebrow: string
  tone?: 'dark' | 'light'
}>()
</script>

<template>
  <aside
    class="rounded-2xl p-5"
    :class="tone === 'light'
      ? 'border border-default bg-default text-default shadow-sm'
      : 'bg-cosmos-950 text-white'"
  >
    <p
      class="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
      :class="tone === 'light' ? 'text-dimmed' : 'text-ember-300'"
    >
      {{ eyebrow }}
    </p>
    <div class="mt-3">
      <slot />
    </div>
  </aside>
</template>
