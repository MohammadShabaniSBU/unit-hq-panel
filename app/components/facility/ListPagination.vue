<script setup lang="ts">
import { PER_PAGE_OPTIONS } from '~/composables/useListPagination'

const props = defineProps<{
  page: number
  totalPages: number
  showingCount: number
  totalCount: number
  canGoPrev: boolean
  canGoNext: boolean
}>()

const perPage = defineModel<number>('perPage', { required: false })

const emit = defineEmits<{
  prev: []
  next: []
  goToPage: [page: number]
}>()

type PageItem = number | 'ellipsis'

function buildPageItems(currentPage: number, lastPage: number): Array<PageItem> {
  if (lastPage <= 0) {
    return []
  }

  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, lastPage, currentPage])

  if (currentPage - 1 > 1) {
    pages.add(currentPage - 1)
  }

  if (currentPage + 1 < lastPage) {
    pages.add(currentPage + 1)
  }

  const sortedPages = [...pages].sort((left, right) => left - right)
  const items: Array<PageItem> = []

  for (let index = 0; index < sortedPages.length; index += 1) {
    const pageNumber = sortedPages[index]
    const previousPageNumber = sortedPages[index - 1]

    if (previousPageNumber !== undefined && pageNumber - previousPageNumber > 1) {
      items.push('ellipsis')
    }

    items.push(pageNumber)
  }

  return items
}

const pageItems = computed(() => buildPageItems(props.page, props.totalPages))
</script>

<template>
  <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-dimmed">
      {{ $t('common.showing', { count: showingCount, total: totalCount.toLocaleString() }) }}
    </p>

    <div class="flex items-center gap-3">
      <div
        v-if="perPage !== undefined"
        class="flex items-center gap-2"
      >
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

        <template
          v-for="(item, index) in pageItems"
          :key="`${item}-${index}`"
        >
          <span
            v-if="item === 'ellipsis'"
            class="px-1 text-sm text-dimmed"
          >
            …
          </span>
          <UButton
            v-else
            :label="String(item)"
            color="neutral"
            :variant="item === page ? 'solid' : 'outline'"
            size="sm"
            class="min-w-8 justify-center tabular-nums"
            :aria-label="$t('common.pageNumber', { page: item })"
            :aria-current="item === page ? 'page' : undefined"
            @click="emit('goToPage', item)"
          />
        </template>

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
