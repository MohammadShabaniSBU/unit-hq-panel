<script setup lang="ts">
/**
 * 6×3 unit-map signature for the login brand panel.
 * Three cells brighter; one outlined empty cell with an open padlock.
 */
const COLS = 6
const ROWS = 3

/** Flat indices (row-major) at opacity 0.22 */
const BRIGHT = new Set([2, 7, 10])
/** Outlined padlock cell */
const LOCK = 8

const cells = Array.from({ length: COLS * ROWS }, (_, i) => i)
</script>

<template>
  <div
    class="grid w-full max-w-[220px] grid-cols-6 gap-1.5"
    aria-hidden="true"
  >
    <div
      v-for="i in cells"
      :key="i"
      class="relative aspect-square rounded-sm"
      :class="i === LOCK
        ? 'login-unit-lock border border-white/40 bg-transparent'
        : BRIGHT.has(i)
          ? 'bg-white/[0.22]'
          : 'bg-white/10'"
    >
      <UIcon
        v-if="i === LOCK"
        name="i-lucide-lock-open"
        class="absolute inset-0 m-auto size-3 text-white/70"
      />
    </div>
  </div>
</template>

<style scoped>
.login-unit-lock {
  border-color: rgba(255, 255, 255, 0.45);
}

@media (prefers-reduced-motion: no-preference) {
  .login-unit-lock {
    animation: login-lock-draw 500ms ease-out both;
  }
}

@keyframes login-lock-draw {
  from {
    border-color: transparent;
    opacity: 0.35;
  }

  to {
    border-color: rgba(255, 255, 255, 0.45);
    opacity: 1;
  }
}
</style>
