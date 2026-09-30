<script setup lang="ts">
const steps = [1, 2, 3, 4]
</script>

<template>
  <section>
    <h2 class="mb-4 text-lg font-bold text-highlighted">
      {{ $t('pages.offerPreview.nextTitle') }}
    </h2>
    <div class="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
      <div
        v-for="step in steps"
        :key="step"
        class="rounded-3xl border border-default bg-default p-5 shadow-sm"
      >
        <div class="flex size-9 items-center justify-center rounded-full bg-inverted text-sm font-bold text-inverted">
          {{ step }}
        </div>
        <h3 class="mt-4 font-semibold text-highlighted">
          {{ $t(`pages.offerPreview.step${step}Title`) }}
        </h3>
        <p class="mt-1 text-sm text-muted">
          {{ $t(`pages.offerPreview.step${step}Body`) }}
        </p>
      </div>
    </div>
  </section>
</template>
