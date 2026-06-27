<script setup lang="ts">
import type { SendEmailActionConfig, ValueSource, EmailBodyType } from '~/types/automation'

const props = defineProps<{
  config: SendEmailActionConfig
}>()

const emit = defineEmits<{
  'update:config': [config: SendEmailActionConfig]
}>()

const valueKindOptions = [
  { label: 'Static value', value: 'static' },
  { label: 'Dynamic expression', value: 'dynamic' },
]

const bodyTypeOptions: Array<{ label: string; value: EmailBodyType }> = [
  { label: 'Email template', value: 'template' },
  { label: 'Custom HTML/text', value: 'raw' },
]

function update(patch: Partial<SendEmailActionConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function setValueSource(field: 'to' | 'subject', kind: 'static' | 'dynamic') {
  const current = props.config[field]
  const next: ValueSource = kind === 'dynamic'
    ? { kind: 'dynamic', expression: current.kind === 'dynamic' ? current.expression : '' }
    : { kind: 'static', value: current.kind === 'static' ? current.value : '' }
  update({ [field]: next })
}

function setValueSourceValue(field: 'to' | 'subject', value: string) {
  const current = props.config[field]
  if (current.kind === 'static') {
    update({ [field]: { kind: 'static', value } })
  }
  else {
    update({ [field]: { kind: 'dynamic', expression: value } })
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- To -->
    <div>
      <p class="mb-1.5 text-sm font-medium text-highlighted">
        {{ $t('automations.config.to') }}
      </p>
      <USelect
        :model-value="config.to.kind"
        :options="valueKindOptions"
        value-key="value"
        class="mb-1.5 w-full"
        @update:model-value="setValueSource('to', $event)"
      />
      <UInput
        v-if="config.to.kind === 'static'"
        :model-value="String(config.to.value ?? '')"
        placeholder="recipient@example.com"
        class="w-full"
        @update:model-value="setValueSourceValue('to', $event)"
      />
      <UInput
        v-else
        :model-value="config.to.expression"
        placeholder="{{trigger.contact.email}}"
        class="w-full font-mono"
        @update:model-value="setValueSourceValue('to', $event)"
      />
    </div>

    <!-- Subject -->
    <div>
      <p class="mb-1.5 text-sm font-medium text-highlighted">
        {{ $t('automations.config.subject') }}
      </p>
      <USelect
        :model-value="config.subject.kind"
        :options="valueKindOptions"
        value-key="value"
        class="mb-1.5 w-full"
        @update:model-value="setValueSource('subject', $event)"
      />
      <UInput
        v-if="config.subject.kind === 'static'"
        :model-value="String(config.subject.value ?? '')"
        :placeholder="$t('automations.config.subjectPlaceholder')"
        class="w-full"
        @update:model-value="setValueSourceValue('subject', $event)"
      />
      <UInput
        v-else
        :model-value="config.subject.expression"
        placeholder="{{trigger.contact.name}} — Your storage is ready"
        class="w-full font-mono"
        @update:model-value="setValueSourceValue('subject', $event)"
      />
    </div>

    <!-- From -->
    <div>
      <p class="mb-1.5 text-sm font-medium text-highlighted">
        {{ $t('automations.config.from') }} <span class="text-dimmed">({{ $t('automations.config.optional') }})</span>
      </p>
      <div class="grid grid-cols-2 gap-2">
        <UInput
          :model-value="config.from?.name ?? ''"
          :placeholder="$t('automations.config.fromName')"
          @update:model-value="update({ from: { ...config.from, name: $event || undefined } })"
        />
        <UInput
          :model-value="config.from?.email ?? ''"
          placeholder="noreply@example.com"
          @update:model-value="update({ from: { ...config.from, email: $event || undefined } })"
        />
      </div>
    </div>

    <!-- Reply-to -->
    <UFormField :label="`${$t('automations.config.replyTo')} (${$t('automations.config.optional')})`">
      <UInput
        :model-value="config.replyTo ?? ''"
        placeholder="support@example.com"
        class="w-full"
        @update:model-value="update({ replyTo: $event || undefined })"
      />
    </UFormField>

    <!-- Body type -->
    <UFormField :label="$t('automations.config.bodyType')">
      <USelect
        :model-value="config.bodyType"
        :options="bodyTypeOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ bodyType: $event })"
      />
    </UFormField>

    <UFormField
      v-if="config.bodyType === 'template'"
      :label="$t('automations.config.templateId')"
    >
      <UInput
        :model-value="config.templateId ?? ''"
        :placeholder="$t('automations.config.templateIdPlaceholder')"
        class="w-full"
        @update:model-value="update({ templateId: $event || undefined })"
      />
    </UFormField>

    <UFormField
      v-else
      :label="$t('automations.config.body')"
    >
      <UTextarea
        :model-value="config.rawBody ?? ''"
        :rows="6"
        :placeholder="$t('automations.config.bodyPlaceholder')"
        class="w-full font-mono text-xs"
        @update:model-value="update({ rawBody: $event })"
      />
    </UFormField>
  </div>
</template>
