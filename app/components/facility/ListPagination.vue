<script setup lang="ts">
import { PER_PAGE_OPTIONS } from '~/composables/useListPagination'

defineProps<{
  showingCount: number
  totalCount: number
  canGoPrev: boolean
  canGoNext: boolean
}>()

const perPage = defineModel<number>('perPage', { required: true })

const emit = defineEmits<{
  prev: []
  next: []
}>()
</script>

<template>
  <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-dimmed">
      {{ $t('common.showing', { count: showingCount, total: totalCount.toLocaleString() }) }}
    </p>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-sm text-dimmed">
          {{ $t('common.perPage') }}
        </span>
        <USelect
          v-model="perPage"
          :items="[...PER_PAGE_OPTIONS]"
          class="w-20"
        />
      </div>

      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!canGoPrev"
          :aria-label="$t('common.previousPage')"
          @click="emit('prev')"
        />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!canGoNext"
          :aria-label="$t('common.nextPage')"
          @click="emit('next')"
        />
      </div>
    </div>
  </div>
</template>
