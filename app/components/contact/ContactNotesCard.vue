<script setup lang="ts">
import type { ApiNote } from '~/types/note'

const props = defineProps<{
  contactId: number
  notes?: Array<ApiNote>
}>()

const emit = defineEmits<{
  added: [note: ApiNote]
}>()

const { t } = useI18n()
const toast = useToast()
const { post } = useApi()

const showForm = ref(false)
const content = ref('')
const submitting = ref(false)

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
      type: 'contact',
      id: props.contactId,
      content: trimmedContent
    })

    emit('added', response.data)
    closeForm()
  } catch {
    toast.add({ title: t('pages.contracts.detail.noteError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-dimmed">
          {{ t('pages.contracts.detail.notes') }}
        </h2>
        <UButton
          v-if="!showForm"
          icon="i-lucide-plus"
          :label="t('pages.contracts.detail.addNote')"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="openForm"
        />
      </div>
    </template>

    <div
      v-if="showForm"
      class="mb-4 space-y-3 border-b border-default pb-4"
    >
      <UTextarea
        v-model="content"
        class="w-full"
        :rows="4"
        :placeholder="t('pages.contracts.detail.notePlaceholder')"
      />
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="submitting"
          @click="closeForm"
        />
        <UButton
          :label="t('common.save')"
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
      {{ t('pages.contracts.detail.noNotes') }}
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
              {{ note.employee?.name ?? t('pages.contracts.detail.noteFallback') }}
            </p>
            <span class="shrink-0 text-xs text-dimmed">
              {{ note.created_at }}
            </span>
          </div>
          <p class="mt-1 text-sm text-dimmed">
            {{ note.content }}
          </p>
        </div>
      </li>
    </ul>
  </UCard>
</template>
