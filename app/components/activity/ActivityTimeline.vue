<script setup lang="ts">
import type { ActivitySubjectType } from '~/types/activity'

const props = defineProps<{
  subjectType: ActivitySubjectType
  subjectId: number | null | undefined
}>()

const { t } = useI18n()
const { formatActivityMessage } = useActivityMessage()

const subjectTypeRef = toRef(props, 'subjectType')
const subjectIdRef = toRef(props, 'subjectId')

const {
  activities,
  pending,
  error,
  refresh,
  totalCount,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  goToPrevPage,
  goToNextPage
} = useActivityList({
  subjectType: subjectTypeRef,
  subjectId: subjectIdRef
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="pending && !activities.length"
      class="flex min-h-32 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-error/30 bg-error/5 p-3"
    >
      <p class="text-sm text-error">
        {{ t('activity.loadError') }}
      </p>
      <UButton
        class="mt-2"
        size="sm"
        variant="ghost"
        :label="t('activity.retry')"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="!activities.length"
      class="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
    >
      <p class="text-sm text-dimmed">
        {{ t('activity.empty') }}
      </p>
    </div>

    <template v-else>
      <UCard
        v-for="activity in activities"
        :key="activity.id"
      >
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-history"
            class="mt-0.5 size-4 shrink-0 text-dimmed"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-highlighted">
                {{ formatActivityMessage(activity) }}
              </p>
              <span class="shrink-0 text-xs text-dimmed">
                {{ activity.created_at }}
              </span>
            </div>
            <p
              v-if="activity.causer?.name"
              class="mt-1 text-xs text-dimmed"
            >
              {{ activity.causer.name }}
            </p>
            <UBadge
              class="mt-2"
              size="sm"
              variant="subtle"
              :label="t(`activity.channels.${activity.log_name}`)"
            />
          </div>
        </div>
      </UCard>

      <div
        v-if="lastPage > 1"
        class="flex items-center justify-between gap-2 pt-1"
      >
        <p class="text-xs text-dimmed">
          {{ t('activity.showing', { count: activities.length, total: totalCount }) }}
        </p>
        <div class="flex gap-1">
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-chevron-left"
            :disabled="!canGoPrev"
            @click="goToPrevPage()"
          />
          <span class="px-2 text-xs text-dimmed self-center">
            {{ page }} / {{ lastPage }}
          </span>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-chevron-right"
            :disabled="!canGoNext"
            @click="goToNextPage()"
          />
        </div>
      </div>
    </template>
  </div>
</template>
