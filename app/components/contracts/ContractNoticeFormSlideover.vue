<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { getLocalTimeZone, today } from '@internationalized/date'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  noticePeriodDays: number
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [scheduledMoveOutOn: string]
}>()

const scheduled = shallowRef<CalendarDate | null>(null)

function defaultScheduled(): CalendarDate {
  return today(getLocalTimeZone()).add({ days: props.noticePeriodDays })
}

watch(open, (isOpen) => {
  if (isOpen) {
    scheduled.value = defaultScheduled()
  }
})

const earliestChargeable = computed(() => toIso(today(getLocalTimeZone()).add({ days: props.noticePeriodDays })))

function toIso(date: CalendarDate): string {
  const y = String(date.year).padStart(4, '0')
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function submit() {
  if (!scheduled.value) return
  emit('submit', toIso(scheduled.value))
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('contracts.notice.title')"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ $t('contracts.notice.hint', { days: noticePeriodDays, date: earliestChargeable }) }}
        </p>

        <UFormField :label="$t('contracts.notice.scheduledDate')">
          <UCalendar
            v-model="scheduled"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="$t('contracts.notice.confirm')"
          :loading="submitting"
          @click="submit"
        />
      </div>
    </template>
  </USlideover>
</template>
