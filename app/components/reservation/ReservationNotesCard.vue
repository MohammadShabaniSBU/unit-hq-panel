<script setup lang="ts">
import type { ApiNote } from '~/types/note'

const props = defineProps<{
  reservationId: number
  notes?: Array<ApiNote>
}>()

const emit = defineEmits<{
  added: [note: ApiNote]
}>()

const toast = useToast()
const { post } = useApi()
const { formatDateTime } = useOrgDateFormat()

const showForm = ref(false)
const content = ref('')
const submitting = ref(false)
const isOpen = ref(true)

const cardUi = computed(() => ({
  header: isOpen.value ? undefined : 'px-4 sm:px-6',
  body: isOpen.value ? undefined : 'p-0 min-h-0 overflow-hidden'
}))

function openForm() {
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  content.value = ''
}

async function onSubmit() {
  const trimmedContent = content.value.trim()

  if (!trimmedContent || submitting.value) {
    return
  }

  submitting.value = true

  try {
    const response = await post<ApiNote>('/api/notes', {
      type: 'reservation',
      id: props.reservationId,
      content: trimmedContent
    })

    emit('added', response.data)
    closeForm()
  } catch {
    toast.add({ title: 'Failed to add note.', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UCard :ui="cardUi">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <button
          type="button"
          class="flex items-center gap-2 cursor-pointer"
          @click="isOpen = !isOpen"
        >
          <h2 class="text-sm font-medium text-dimmed">
            Notes
          </h2>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-4 text-dimmed transition-transform duration-200"
            :class="{ 'rotate-180': !isOpen }"
          />
        </button>
        <UButton
          v-if="!showForm"
          icon="i-lucide-plus"
          label="Add note"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="openForm"
        />
      </div>
    </template>

    <div
      class="grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
      :class="isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
    >
      <div class="overflow-hidden min-h-0">
        <div
          v-if="showForm"
          class="mb-4 space-y-3 border-b border-default pb-4"
        >
          <UTextarea
            v-model="content"
            class="w-full"
            :rows="4"
            placeholder="Write a note..."
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="submitting"
              @click="closeForm"
            />
            <UButton
              label="Save"
              color="primary"
              size="sm"
              :loading="submitting"
              :disabled="!content.trim()"
              @click="onSubmit"
            />
          </div>
        </div>

        <div
          v-if="!notes?.length"
          class="py-4 text-center text-sm text-dimmed"
        >
          No notes yet.
        </div>
        <ul
          v-else
          class="divide-y divide-default"
        >
          <li
            v-for="note in notes"
            :key="note.id"
            class="flex gap-3 py-4 first:pt-0 last:pb-0"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
              <UIcon
                name="i-lucide-sticky-note"
                class="size-4 text-dimmed"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-medium text-highlighted">
                  {{ note.employee?.name ?? 'Note' }}
                </p>
                <span class="shrink-0 text-xs text-dimmed">
                  {{ formatDateTime(note.created_at) }}
                </span>
              </div>
              <p class="mt-1 text-sm text-dimmed">
                {{ note.content }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </UCard>
</template>
