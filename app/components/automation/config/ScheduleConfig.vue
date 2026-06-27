<script setup lang="ts">
import type { ScheduleTriggerConfig, ScheduleFrequency } from '~/types/automation'

const props = defineProps<{
  config: ScheduleTriggerConfig
}>()

const emit = defineEmits<{
  'update:config': [config: ScheduleTriggerConfig]
}>()

const frequencyOptions: Array<{ label: string; value: ScheduleFrequency }> = [
  { label: 'Once', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom (cron)', value: 'cron' },
]

const dayOptions = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
]

const commonTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
]

const timezoneOptions = commonTimezones.map(tz => ({ label: tz, value: tz }))

function update(patch: Partial<ScheduleTriggerConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function toggleDay(day: number) {
  const days = props.config.daysOfWeek ?? []
  const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort()
  update({ daysOfWeek: updated })
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('automations.config.frequency')">
      <USelect
        :model-value="config.frequency"
        :options="frequencyOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ frequency: $event })"
      />
    </UFormField>

    <UFormField :label="$t('automations.config.timezone')">
      <USelect
        :model-value="config.timezone"
        :options="timezoneOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ timezone: $event })"
      />
    </UFormField>

    <!-- Weekly: day picker -->
    <UFormField
      v-if="config.frequency === 'weekly'"
      :label="$t('automations.config.daysOfWeek')"
    >
      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="day in dayOptions"
          :key="day.value"
          size="xs"
          :variant="(config.daysOfWeek ?? []).includes(day.value) ? 'solid' : 'outline'"
          color="primary"
          :label="day.label.slice(0, 3)"
          @click="toggleDay(day.value)"
        />
      </div>
    </UFormField>

    <!-- Monthly: day of month -->
    <UFormField
      v-if="config.frequency === 'monthly'"
      :label="$t('automations.config.dayOfMonth')"
    >
      <UInput
        :model-value="String(config.dayOfMonth ?? '')"
        type="number"
        min="1"
        max="31"
        :placeholder="$t('automations.config.dayOfMonthPlaceholder')"
        class="w-full"
        @update:model-value="update({ dayOfMonth: Number($event) })"
      />
    </UFormField>

    <!-- Cron expression -->
    <UFormField
      v-if="config.frequency === 'cron'"
      :label="$t('automations.config.cronExpression')"
    >
      <UInput
        :model-value="config.cronExpression ?? ''"
        placeholder="0 9 * * 1-5"
        class="w-full font-mono"
        @update:model-value="update({ cronExpression: $event })"
      />
      <template #hint>
        <span class="text-xs text-dimmed">{{ $t('automations.config.cronHint') }}</span>
      </template>
    </UFormField>

    <UFormField :label="$t('automations.config.startAt')">
      <UInput
        :model-value="config.startAt ?? ''"
        type="datetime-local"
        class="w-full"
        @update:model-value="update({ startAt: $event || undefined })"
      />
    </UFormField>

    <UFormField
      v-if="config.frequency !== 'once'"
      :label="$t('automations.config.endAt')"
    >
      <UInput
        :model-value="config.endAt ?? ''"
        type="datetime-local"
        class="w-full"
        @update:model-value="update({ endAt: $event || undefined })"
      />
    </UFormField>
  </div>
</template>
