<script setup lang="ts">
import type { SampleContextItem } from '~/composables/useEmailTemplates'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  previewHtml: string
  loading: boolean
  sampleContexts: Array<SampleContextItem>
  contactId: number | null
  contractId: number | null
  testEmail: string
  sendingTest: boolean
}>()

const emit = defineEmits<{
  'update:contactId': [value: number | null]
  'update:contractId': [value: number | null]
  'update:testEmail': [value: string]
  refresh: []
  'test-send': []
}>()

const viewport = ref<'desktop' | 'mobile'>('desktop')

const contactOptions = computed(() =>
  props.sampleContexts.map(item => ({
    label: `${item.contact.name}${item.contact.email ? ` <${item.contact.email}>` : ''}`,
    value: item.contact.id
  }))
)

const contractOptions = computed(() => {
  const selected = props.sampleContexts.find(c => c.contact.id === props.contactId)
  const contracts = selected?.contracts ?? []
  return [
    { label: '—', value: null as number | null },
    ...contracts.map(c => ({
      label: `#${c.id} (${c.status})`,
      value: c.id as number | null
    }))
  ]
})

watch(open, (isOpen) => {
  if (isOpen) emit('refresh')
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('templates.builder.previewTitle')"
    class="max-w-4xl"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField
            :label="$t('templates.builder.sampleContext')"
            class="min-w-[220px] flex-1"
          >
            <USelect
              :model-value="contactId ?? undefined"
              :items="contactOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(v) => emit('update:contactId', v == null ? null : Number(v))"
            />
          </UFormField>
          <UFormField
            :label="$t('templates.builder.sampleContract')"
            class="min-w-[160px]"
          >
            <USelect
              :model-value="contractId ?? undefined"
              :items="contractOptions"
              value-key="value"
              class="w-full"
              @update:model-value="(v) => emit('update:contractId', v == null ? null : Number(v))"
            />
          </UFormField>
          <UButtonGroup>
            <UButton
              size="sm"
              :color="viewport === 'desktop' ? 'primary' : 'neutral'"
              :variant="viewport === 'desktop' ? 'solid' : 'outline'"
              icon="i-lucide-monitor"
              @click="viewport = 'desktop'"
            />
            <UButton
              size="sm"
              :color="viewport === 'mobile' ? 'primary' : 'neutral'"
              :variant="viewport === 'mobile' ? 'solid' : 'outline'"
              icon="i-lucide-smartphone"
              @click="viewport = 'mobile'"
            />
          </UButtonGroup>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            @click="emit('refresh')"
          />
        </div>

        <div class="flex justify-center rounded-lg border border-default bg-muted p-4">
          <div
            class="overflow-hidden rounded bg-white shadow-sm transition-all"
            :style="{ width: viewport === 'mobile' ? '375px' : '100%', maxWidth: '600px' }"
          >
            <div
              v-if="loading"
              class="flex h-64 items-center justify-center"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin text-dimmed"
              />
            </div>
            <iframe
              v-else
              class="h-[480px] w-full border-0"
              sandbox=""
              :srcdoc="previewHtml"
              title="preview"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-3 border-t border-default pt-4">
          <UFormField
            :label="$t('templates.builder.testSendTo')"
            class="min-w-[240px] flex-1"
          >
            <UInput
              :model-value="testEmail"
              type="email"
              class="w-full"
              :placeholder="$t('templates.builder.testSendPlaceholder')"
              @update:model-value="(v) => emit('update:testEmail', String(v))"
            />
          </UFormField>
          <UButton
            :label="$t('templates.builder.testSend')"
            icon="i-lucide-send"
            :loading="sendingTest"
            :disabled="!testEmail || !contactId"
            @click="emit('test-send')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
