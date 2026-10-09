<script setup lang="ts">
import type { SendSmsActionConfig, SmsBodyType } from '~/types/automation'

const props = defineProps<{
  config: SendSmsActionConfig
}>()

const emit = defineEmits<{
  'update:config': [config: SendSmsActionConfig]
}>()

const { t } = useI18n()
const { templates } = useSmsTemplatesList({ sendable: true })

const bodyTypeOptions = computed<Array<{ label: string, value: SmsBodyType }>>(() => [
  { label: t('automations.config.smsBodyTemplate'), value: 'template' },
  { label: t('automations.config.smsBodyCustom'), value: 'custom' }
])

const templateOptions = computed(() =>
  templates.value.map(template => ({ label: template.name, value: template.id }))
)

function update(patch: Partial<SendSmsActionConfig>) {
  emit('update:config', { ...props.config, ...patch })
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('automations.config.bodyType')">
      <USelect
        :model-value="config.bodyType"
        :items="bodyTypeOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ bodyType: $event as SmsBodyType })"
      />
    </UFormField>

    <UFormField
      v-if="config.bodyType === 'template'"
      :label="$t('automations.config.template')"
    >
      <USelectMenu
        :model-value="config.template_family_id"
        :items="templateOptions"
        value-key="value"
        class="w-full"
        :placeholder="$t('automations.config.noSendableTemplates')"
        @update:model-value="(id: number | undefined) => update({ template_family_id: id })"
      />
    </UFormField>

    <UFormField
      v-else
      :label="$t('automations.config.body')"
    >
      <UTextarea
        :model-value="config.body ?? ''"
        :rows="4"
        :placeholder="$t('automations.config.bodyPlaceholder')"
        class="w-full"
        @update:model-value="update({ body: $event })"
      />
    </UFormField>
  </div>
</template>
