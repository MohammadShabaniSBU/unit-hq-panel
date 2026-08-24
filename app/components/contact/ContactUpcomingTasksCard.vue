<script setup lang="ts">
import type { ApiTask, TaskPriority, TaskStatus } from '~/types/task'
import { TASK_STATUSES } from '~/types/task'

const props = defineProps<{
  contactId: number
  tasks: Array<ApiTask>
}>()

const emit = defineEmits<{
  added: [task: ApiTask]
  statusUpdated: [task: ApiTask]
}>()

const { t } = useI18n()
const toast = useToast()
const { patch } = useApi()
const { formatDate, formatDateTime } = useOrgDateFormat()

const showTaskForm = ref(false)
const expandedId = ref<number | null>(null)
const updatingTaskId = ref<number | null>(null)

function onTaskSaved(task: ApiTask) {
  emit('added', task)
}

function toggleTask(taskId: number) {
  expandedId.value = expandedId.value === taskId ? null : taskId
}

async function onStatusChange(task: ApiTask, status: TaskStatus) {
  if (status === task.status || updatingTaskId.value !== null) return

  updatingTaskId.value = task.id

  try {
    const response = await patch<ApiTask>(
      `/api/contacts/${props.contactId}/tasks/${task.id}`,
      { status }
    )

    emit('statusUpdated', response.data)
  } catch {
    toast.add({ title: t('forms.task.updateErrorMessage'), color: 'error' })
  } finally {
    updatingTaskId.value = null
  }
}

function priorityDotClass(priority: TaskPriority) {
  if (priority === 'urgent' || priority === 'high') {
    return 'bg-error'
  }

  if (priority === 'medium') {
    return 'bg-warning'
  }

  return 'bg-dimmed'
}

function dueDateClass(priority: TaskPriority) {
  if (priority === 'urgent' || priority === 'high') {
    return 'text-error'
  }

  if (priority === 'medium') {
    return 'text-warning'
  }

  return 'text-dimmed'
}

function taskStatusColor(status: TaskStatus) {
  if (status === 'done') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'error'
  }

  if (status === 'in_progress') {
    return 'warning'
  }

  return 'neutral'
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-dimmed">
          {{ $t('forms.task.upcomingTasks') }}
        </h2>
        <UButton
          icon="i-lucide-plus"
          :label="$t('forms.task.addTask')"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="showTaskForm = true"
        />
      </div>
    </template>

    <div
      v-if="!tasks.length"
      class="py-4 text-center text-sm text-dimmed"
    >
      {{ $t('forms.task.noPendingTasks') }}
    </div>
    <ul
      v-else
      class="space-y-3"
    >
      <li
        v-for="task in tasks.slice(0, 5)"
        :key="task.id"
        class="rounded-lg border border-default"
      >
        <div class="flex items-center gap-2 px-3 py-2.5">
          <span
            class="size-2 shrink-0 rounded-full"
            :class="priorityDotClass(task.priority)"
            :title="t(`taskPriority.${task.priority}`)"
          />

          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="truncate text-sm font-medium text-highlighted">
              {{ task.title }}
            </span>
            <UBadge
              v-if="task.type"
              :label="t(`taskType.${task.type}`)"
              color="neutral"
              variant="soft"
              size="xs"
            />
          </div>

          <span
            class="shrink-0 text-xs font-medium"
            :class="dueDateClass(task.priority)"
          >
            {{ formatDate(task.due_date) }}
          </span>

          <UButton
            icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            class="shrink-0 transition-transform duration-200"
            :class="{ 'rotate-180': expandedId === task.id }"
            :aria-label="t('forms.task.details')"
            :aria-expanded="expandedId === task.id"
            @click="toggleTask(task.id)"
          />
        </div>

        <div
          v-if="expandedId === task.id"
          class="space-y-3 border-t border-default px-3 py-2.5"
        >
          <div>
            <p class="text-xs text-dimmed">
              {{ $t('forms.task.description') }}
            </p>
            <p
              class="mt-0.5 text-sm"
              :class="task.description ? 'text-highlighted' : 'text-dimmed'"
            >
              {{ task.description ?? $t('forms.task.noDescription') }}
            </p>
          </div>

          <div class="flex flex-wrap items-end gap-4">
            <div>
              <p class="text-xs text-dimmed">
                {{ $t('forms.task.remindAt') }}
              </p>
              <p class="mt-1 text-sm text-highlighted">
                {{ formatDateTime(task.remind_at) }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <USelect
                :model-value="task.status"
                :items="TASK_STATUSES.map(s => ({ label: t(`taskStatus.${s}`), value: s }))"
                value-key="value"
                label-key="label"
                size="xs"
                :disabled="updatingTaskId === task.id"
                @update:model-value="(s: TaskStatus) => onStatusChange(task, s)"
              />
              <UIcon
                v-if="updatingTaskId === task.id"
                name="i-lucide-loader-circle"
                class="size-4 animate-spin text-dimmed"
              />
            </div>
          </div>
        </div>
      </li>
    </ul>

    <ContactTaskFormSlideover
      v-model:open="showTaskForm"
      :contact-id="contactId"
      @saved="onTaskSaved"
    />
  </UCard>
</template>
