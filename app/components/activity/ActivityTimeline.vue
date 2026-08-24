<script setup lang="ts">
import type { ActivitySubjectType } from '~/types/activity'
import type { ApiTask } from '~/types/task'

const props = withDefaults(defineProps<{
  subjectType: ActivitySubjectType
  subjectId: number | null | undefined
  perPage?: number
  showPagination?: boolean
}>(), {
  showPagination: true
})

const { t } = useI18n()
const toast = useToast()
const { formatDateTime } = useOrgDateFormat()
const { formatActivityMessage, formatActivityChanges, resolveActivityTarget } = useActivityMessage()
const { fetchTask } = useTask()

const subjectTypeRef = toRef(props, 'subjectType')
const subjectIdRef = toRef(props, 'subjectId')
const perPageRef = toRef(props, 'perPage')

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
  subjectId: subjectIdRef,
  perPage: perPageRef
})

const activityRows = computed(() =>
  activities.value.map(activity => ({
    activity,
    changes: formatActivityChanges(activity),
    target: resolveActivityTarget(activity)
  }))
)

const showTaskForm = ref(false)
const editingTask = ref<ApiTask | null>(null)
const openingTask = ref(false)

const titleLinkClass = 'inline-flex max-w-full items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 text-left hover:opacity-80'


async function openTask(taskId: number) {
  if (openingTask.value) {
    return
  }

  openingTask.value = true

  try {
    editingTask.value = await fetchTask(taskId)
    showTaskForm.value = true
  } catch {
    toast.add({
      title: t('pages.tasks.loadError'),
      color: 'error'
    })
  } finally {
    openingTask.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="pending && !activities.length"
      class="flex min-h-20 items-center justify-center"
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
      class="flex min-h-20 items-center justify-center py-4"
    >
      <p class="text-sm text-dimmed">
        {{ t('activity.empty') }}
      </p>
    </div>

    <template v-else>
      <ul class="divide-y divide-default">
        <li
          v-for="{ activity, changes, target } in activityRows"
          :key="activity.id"
          class="flex gap-2.5 py-2.5 first:pt-0 last:pb-0"
        >
          <UIcon
            name="i-lucide-history"
            class="mt-0.5 size-3.5 shrink-0 text-dimmed"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <NuxtLink
                v-if="target?.type === 'deal'"
                :to="`/leasing/deals/${target.id}`"
                :class="titleLinkClass"
              >
                <span class="min-w-0 truncate">{{ formatActivityMessage(activity) }}</span>
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="size-3.5 shrink-0"
                />
              </NuxtLink>
              <button
                v-else-if="target?.type === 'task'"
                type="button"
                :class="titleLinkClass"
                :disabled="openingTask"
                @click="openTask(target.id)"
              >
                <span class="min-w-0 truncate">{{ formatActivityMessage(activity) }}</span>
                <UIcon
                  name="i-lucide-panel-right"
                  class="size-3.5 shrink-0"
                />
              </button>
              <p
                v-else
                class="text-sm font-medium text-highlighted"
              >
                {{ formatActivityMessage(activity) }}
              </p>
              <span class="shrink-0 text-xs text-dimmed tabular-nums">
                {{ formatDateTime(activity.created_at) }}
              </span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                v-if="activity.causer?.name"
                class="text-xs text-dimmed"
              >
                {{ activity.causer.name }}
              </span>
              <UBadge
                size="sm"
                variant="subtle"
                :label="t(`activity.channels.${activity.log_name}`)"
              />
            </div>
            <ul
              v-if="changes.length"
              class="mt-1 space-y-0.5"
            >
              <li
                v-for="(change, index) in changes"
                :key="`${activity.id}-${index}`"
                class="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted"
              >
                <span class="font-medium text-default">{{ change.label }}:</span>
                <template v-if="change.from != null && change.to != null">
                  <span>{{ change.from }}</span>
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="size-3 shrink-0 text-dimmed"
                  />
                  <span>{{ change.to }}</span>
                </template>
                <template v-else-if="change.to != null">
                  <span>{{ change.to }}</span>
                </template>
                <template v-else-if="change.from != null">
                  <span>{{ change.from }}</span>
                </template>
              </li>
            </ul>
          </div>
        </li>
      </ul>

      <div
        v-if="showPagination && lastPage > 1"
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

    <TasksTaskFormSlideover
      v-model:open="showTaskForm"
      :task="editingTask"
    />
  </div>
</template>
