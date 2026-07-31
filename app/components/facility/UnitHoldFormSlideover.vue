<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { getLocalTimeZone, today } from '@internationalized/date'
import type { ManualHoldType, PlaceUnitHoldPayload } from '~/types/unit'
import { MANUAL_HOLD_TYPES } from '~/types/unit'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: PlaceUnitHoldPayload]
}>()

const { t } = useI18n()

const holdType = ref<ManualHoldType>('maintenance')
const startsOn = shallowRef<CalendarDate | null>(null)
const endsOn = shallowRef<CalendarDate | null>(null)
const reason = ref('')
const fieldError = ref<string | null>(null)

const holdTypeItems = computed(() =>
  MANUAL_HOLD_TYPES.map(value => ({
    value,
    label: t(`units.holds.types.${value}`)
  }))
)

watch(open, (isOpen) => {
  if (isOpen) {
    holdType.value = 'maintenance'
    startsOn.value = null
    endsOn.value = null
    reason.value = ''
    fieldError.value = null
  }
})

function calendarToIso(date: CalendarDate | null): string | undefined {
  if (!date) {
    return undefined
  }

  const y = String(date.year).padStart(4, '0')
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function onSubmit() {
  fieldError.value = null

  if (!reason.value.trim()) {
    fieldError.value = t('units.holds.reasonRequired')
    return
  }

  emit('submit', {
    hold_type: holdType.value,
    starts_on: calendarToIso(startsOn.value),
    ends_on: calendarToIso(endsOn.value) ?? null,
    reason: reason.value.trim()
  })
}

const siteTodayHint = computed(() => {
  const d = today(getLocalTimeZone())
  return `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
})
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('units.holds.takeOutOfService')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('units.holds.holdType')"
          name="hold_type"
          required
        >
          <USelect
            v-model="holdType"
            :items="holdTypeItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('units.holds.startsOn')"
          name="starts_on"
          :hint="$t('units.holds.startsOnHint')"
        >
          <UInputDate
            v-model="startsOn"
            class="w-full"
          >
            <template #trailing>
              <UPopover>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="startsOn"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>

        <UFormField
          :label="$t('units.holds.endsOn')"
          name="ends_on"
          :hint="$t('units.holds.endsOnHint')"
        >
          <UInputDate
            v-model="endsOn"
            class="w-full"
          >
            <template #trailing>
              <UPopover>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="endsOn"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>

        <UFormField
          :label="$t('units.holds.reason')"
          name="reason"
          required
          :error="fieldError ?? undefined"
        >
          <UTextarea
            v-model="reason"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <p class="text-xs text-dimmed">
          {{ $t('units.holds.siteTodayNote', { date: siteTodayHint }) }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :label="$t('common.cancel')"
            @click="open = false"
          />
          <UButton
            type="submit"
            color="primary"
            :label="$t('units.holds.takeOutOfService')"
            :loading="props.submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
