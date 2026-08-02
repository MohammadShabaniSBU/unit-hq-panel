<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import DOMPurify from 'dompurify'
import type { ApiContact } from '~/types/contact'
import type { ApiCommsTriageDetail } from '~/types/inbox'

const props = defineProps<{
  detail: ApiCommsTriageDetail | null
  pending: boolean
  resolving: boolean
}>()

const emit = defineEmits<{
  attach: [contactId: number]
  createAndAttach: [names: { first_name: string, last_name: string }]
  discard: [reason: string]
}>()

const { t, locale } = useI18n()
const { getPaginated } = useApi()
const { formatContactName } = useContactFormatters()

const attachOpen = ref(false)
const createOpen = ref(false)
const discardOpen = ref(false)

const contactSearch = ref('')
const contactItems = ref<Array<{ label: string, value: number }>>([])
const contactPending = ref(false)
const selectedContactId = ref<number | null>(null)

const createFirstName = ref('')
const createLastName = ref('')
const discardReason = ref('')

const sanitizedHtml = computed(() => {
  if (!props.detail || props.detail.body.format !== 'html' || !props.detail.body.content) {
    return null
  }

  const html = props.detail.body.content
  return import.meta.client ? DOMPurify.sanitize(html) : html
})

const receivedLabel = computed(() => {
  if (!props.detail?.created_at) {
    return ''
  }

  return new Date(props.detail.created_at).toLocaleString(locale.value === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
})

async function searchContacts(term: string) {
  contactPending.value = true
  try {
    const response = await getPaginated<ApiContact>('/api/contacts', {
      page: 1,
      per_page: 20,
      ...(term.trim() ? { q: term.trim() } : {})
    })
    contactItems.value = response.data.map(contact => ({
      label: formatContactName(contact),
      value: contact.id
    }))
  } catch {
    contactItems.value = []
  } finally {
    contactPending.value = false
  }
}

const debouncedSearch = useDebounceFn((term: string) => {
  searchContacts(term)
}, 250)

watch(contactSearch, (term) => {
  debouncedSearch(term)
})

watch(attachOpen, (open) => {
  if (open) {
    selectedContactId.value = null
    contactSearch.value = ''
    searchContacts('')
  }
})

watch(createOpen, (open) => {
  if (open) {
    createFirstName.value = ''
    createLastName.value = ''
  }
})

watch(discardOpen, (open) => {
  if (open) {
    discardReason.value = ''
  }
})

function confirmAttach() {
  if (selectedContactId.value === null) {
    return
  }
  emit('attach', selectedContactId.value)
  attachOpen.value = false
}

function confirmCreate() {
  emit('createAndAttach', {
    first_name: createFirstName.value.trim() || 'Unknown',
    last_name: createLastName.value.trim() || 'Sender'
  })
  createOpen.value = false
}

function confirmDiscard() {
  emit('discard', discardReason.value)
  discardOpen.value = false
}
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col">
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="!detail"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <UIcon
        name="i-lucide-inbox"
        class="size-8 text-dimmed"
      />
      <p class="text-sm text-dimmed">
        {{ t('inbox.triage.selectPrompt') }}
      </p>
    </div>

    <template v-else>
      <div class="flex shrink-0 items-start justify-between gap-3 border-b border-default px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ detail.preview.from || detail.sender_value }}
          </p>
          <p
            v-if="detail.preview.subject"
            class="mt-0.5 truncate text-sm text-toned"
          >
            {{ detail.preview.subject }}
          </p>
          <p class="mt-1 text-xs text-dimmed">
            {{ detail.sender_value }}
            <span v-if="receivedLabel"> · {{ receivedLabel }}</span>
          </p>
        </div>
        <UBadge
          :label="t(`inbox.channels.${detail.channel}`)"
          color="warning"
          variant="subtle"
          size="sm"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div
          v-if="sanitizedHtml"
          class="prose prose-sm max-w-none dark:prose-invert"
          v-html="sanitizedHtml"
        />
        <p
          v-else
          class="whitespace-pre-wrap text-sm text-toned"
        >
          {{ detail.body.content || detail.preview.body_text || t('inbox.triage.noPreview') }}
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2 border-t border-default px-4 py-3">
        <UButton
          :label="t('inbox.triage.attach')"
          icon="i-lucide-link"
          color="primary"
          :disabled="resolving"
          @click="attachOpen = true"
        />
        <UButton
          :label="t('inbox.triage.createAndAttach')"
          icon="i-lucide-user-plus"
          color="neutral"
          variant="subtle"
          :disabled="resolving"
          @click="createOpen = true"
        />
        <UButton
          :label="t('inbox.triage.discard')"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          :disabled="resolving"
          @click="discardOpen = true"
        />
      </div>
    </template>

    <UModal
      v-model:open="attachOpen"
      :title="t('inbox.triage.attachTitle')"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="text-sm text-dimmed">
            {{ t('inbox.triage.attachHelp') }}
          </p>
          <USelectMenu
            v-model:search-term="contactSearch"
            :model-value="selectedContactId ?? undefined"
            :items="contactItems"
            value-key="value"
            ignore-filter
            :loading="contactPending"
            :placeholder="t('inbox.triage.contactSearch')"
            class="w-full"
            @update:model-value="(v: number | null | undefined) => { selectedContactId = v ?? null }"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('inbox.triage.cancel')"
            color="neutral"
            variant="ghost"
            @click="attachOpen = false"
          />
          <UButton
            :label="t('inbox.triage.confirmAttach')"
            color="primary"
            :disabled="selectedContactId === null || resolving"
            :loading="resolving"
            @click="confirmAttach"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="createOpen"
      :title="t('inbox.triage.createTitle')"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField :label="t('inbox.triage.firstName')">
            <UInput
              v-model="createFirstName"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('inbox.triage.lastName')">
            <UInput
              v-model="createLastName"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('inbox.triage.channelValue')">
            <UInput
              :model-value="detail?.sender_value ?? ''"
              disabled
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('inbox.triage.cancel')"
            color="neutral"
            variant="ghost"
            @click="createOpen = false"
          />
          <UButton
            :label="t('inbox.triage.confirmCreate')"
            color="primary"
            :loading="resolving"
            :disabled="resolving"
            @click="confirmCreate"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="discardOpen"
      :title="t('inbox.triage.discardTitle')"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="text-sm text-dimmed">
            {{ t('inbox.triage.discardHelp') }}
          </p>
          <UFormField :label="t('inbox.triage.discardReason')">
            <UTextarea
              v-model="discardReason"
              :placeholder="t('inbox.triage.discardReasonPlaceholder')"
              class="w-full"
              :rows="3"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('inbox.triage.cancel')"
            color="neutral"
            variant="ghost"
            @click="discardOpen = false"
          />
          <UButton
            :label="t('inbox.triage.confirmDiscard')"
            color="error"
            :loading="resolving"
            :disabled="resolving"
            @click="confirmDiscard"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
