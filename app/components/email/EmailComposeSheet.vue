<script setup lang="ts">
const props = defineProps<{
  open: boolean
  contactId: number
  contactName?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  sent: [payload: { threadId: number }]
}>()

const { t } = useI18n()
const { post } = useApi()

const subject = ref('')
const bodyText = ref('')
const selectedTemplateId = ref<number | null>(null)
const sending = ref(false)
const sendError = ref<string | null>(null)
const suppressionScope = ref<'all' | 'marketing' | null>(null)

const { templates } = useEmailTemplatesList()
const templateItems = computed(() => [
  { label: t('inbox.composer.template.none'), value: null as number | null },
  ...templates.value.map(tpl => ({ label: tpl.name, value: tpl.id }))
])

const canSend = computed(() => {
  if (sending.value || suppressionScope.value === 'all') {
    return false
  }
  if (!subject.value.trim()) {
    return false
  }
  return bodyText.value.trim().length > 0 || selectedTemplateId.value !== null
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    return
  }
  subject.value = ''
  bodyText.value = ''
  selectedTemplateId.value = null
  sendError.value = null
  suppressionScope.value = null
})

async function send() {
  if (!canSend.value) {
    return
  }
  sending.value = true
  sendError.value = null
  try {
    const payload: Record<string, unknown> = {
      contact_id: props.contactId,
      channel: 'email',
      subject: subject.value.trim()
    }
    if (selectedTemplateId.value !== null) {
      payload.template_family_id = selectedTemplateId.value
    } else {
      payload.body_text = bodyText.value
    }
    const response = await post<{ thread_id: number }>('/api/inbox/compose', payload)
    emit('sent', { threadId: response.data.thread_id })
    emit('update:open', false)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string, errors?: { suppression?: { scope?: string } } } }
    sendError.value = fetchError.data?.message ?? t('emailCompose.error')
    const scope = fetchError.data?.errors?.suppression?.scope
    if (scope === 'all' || scope === 'marketing') {
      suppressionScope.value = scope
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <USlideover
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #title>
      {{ t('emailCompose.title', { name: contactName || '' }) }}
    </template>

    <div class="flex flex-col gap-3 p-4">
      <UAlert
        v-if="suppressionScope === 'all'"
        color="error"
        variant="subtle"
        :title="t('inbox.composer.suppressedAll')"
      />
      <UAlert
        v-else-if="suppressionScope === 'marketing'"
        color="warning"
        variant="subtle"
        :title="t('inbox.composer.suppressedMarketing')"
      />

      <UFormField :label="t('templates.builder.subject')">
        <UInput
          v-model="subject"
          :placeholder="t('templates.builder.subjectPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('inbox.composer.template.label')">
        <USelectMenu
          v-model="selectedTemplateId"
          :items="templateItems"
          value-key="value"
          class="w-full"
        />
      </UFormField>

      <UTextarea
        v-if="!selectedTemplateId"
        v-model="bodyText"
        :rows="6"
        autoresize
        :placeholder="t('inbox.composer.placeholderEmail')"
      />
      <p
        v-else
        class="rounded-md border border-default bg-elevated px-3 py-2 text-sm text-muted"
      >
        {{ t('emailCompose.templateSelected', {
          name: templates.find(tpl => tpl.id === selectedTemplateId)?.name ?? ''
        }) }}
      </p>

      <p
        v-if="sendError"
        class="text-sm text-error"
      >
        {{ sendError }}
      </p>

      <div class="mt-2 flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('emailCompose.cancel')"
          @click="emit('update:open', false)"
        />
        <UButton
          color="primary"
          :label="t('emailCompose.send')"
          :loading="sending"
          :disabled="!canSend"
          @click="send"
        />
      </div>
    </div>
  </USlideover>
</template>
