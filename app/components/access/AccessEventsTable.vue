<script setup lang="ts">
import type { AccessEventFilters } from '~/composables/useAccessEvents'

const props = defineProps<{
  url: string
  filters?: AccessEventFilters
  showContact?: boolean
}>()

const { t, d } = useI18n()

const deniedOnly = ref(Boolean(props.filters?.denied_only))

const activeFilters = computed<AccessEventFilters>(() => ({
  ...(props.filters ?? {}),
  denied_only: deniedOnly.value
}))

const {
  events,
  pending,
  loadingMore,
  error,
  hasMore,
  refresh,
  loadMore
} = useAccessEvents({
  url: () => props.url,
  filters: activeFilters
})

function eventColor(type: string) {
  return type === 'denied' ? 'error' as const : 'success' as const
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <UCheckbox
        v-model="deniedOnly"
        :label="t('access.events.deniedOnly')"
      />
      <UButton
        :label="t('access.events.refresh')"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="pending"
        @click="refresh()"
      />
    </div>

    <div
      v-if="pending && events.length === 0"
      class="flex items-center justify-center py-10"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ t('access.events.loadError') }}
    </p>

    <div
      v-else-if="events.length === 0"
      class="rounded-md bg-muted px-3 py-4 text-sm text-dimmed"
    >
      {{ t('access.events.empty') }}
    </div>

    <ul
      v-else
      class="divide-y divide-default rounded-md border border-default"
    >
      <li
        v-for="event in events"
        :key="event.id"
        class="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm"
      >
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              :color="eventColor(String(event.event_type))"
              variant="subtle"
              :label="t(`access.events.types.${event.event_type}`, event.event_type)"
            />
            <span class="text-highlighted">
              {{ event.point_label || event.provider_point_id || t('access.events.unknownPoint') }}
            </span>
          </div>
          <p class="text-xs text-dimmed">
            <span v-if="showContact !== false">
              {{ event.contact_name || event.provider_credential_ref || t('access.events.unresolvedContact') }}
              ·
            </span>
            {{ event.occurred_at ? d(event.occurred_at, 'short') : '—' }}
          </p>
          <p
            v-if="event.restriction_context"
            class="text-xs text-warning"
          >
            {{ t(`access.events.restriction.${event.restriction_context}`, event.restriction_context) }}
          </p>
        </div>
      </li>
    </ul>

    <div
      v-if="hasMore"
      class="flex justify-center"
    >
      <UButton
        :label="t('access.events.loadMore')"
        color="neutral"
        variant="outline"
        size="sm"
        :loading="loadingMore"
        @click="loadMore()"
      />
    </div>
  </div>
</template>
