<script setup lang="ts">
import type { CountdownParts } from '~/composables/useCountdown'

const props = defineProps<{
  expiresAt: string
  parts: CountdownParts
}>()

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()

function pad(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0')
}

const units = computed((): Array<{ key: string, value: string, label: string }> => {
  const items: Array<{ key: string, value: string, label: string }> = []

  if (props.parts.days > 0) {
    items.push({
      key: 'days',
      value: pad(props.parts.days),
      label: t('pages.offerPreview.unitDays')
    })
  }

  items.push(
    { key: 'hours', value: pad(props.parts.hours), label: t('pages.offerPreview.unitHours') },
    { key: 'minutes', value: pad(props.parts.minutes), label: t('pages.offerPreview.unitMinutes') },
    { key: 'seconds', value: pad(props.parts.seconds), label: t('pages.offerPreview.unitSeconds') }
  )

  return items
})

const urgency = computed((): 'default' | 'warning' | 'urgent' => {
  if (props.parts.expired || props.parts.remainingMs <= 60 * 60 * 1000) {
    return 'urgent'
  }
  if (props.parts.remainingMs <= 24 * 60 * 60 * 1000) {
    return 'warning'
  }
  return 'default'
})

const expiresAtLabel = computed(() => formatDateTime(props.expiresAt))

const remainingAria = computed(() => t('pages.offerPreview.remainingAria', {
  days: props.parts.days,
  hours: props.parts.hours,
  minutes: props.parts.minutes
}))

const shellClass = computed(() => {
  if (urgency.value === 'urgent') {
    return 'border-error/40 bg-error/5'
  }
  if (urgency.value === 'warning') {
    return 'border-warning/40 bg-warning/5'
  }
  return 'border-primary/20 bg-primary/5'
})

const numberClass = computed(() => {
  if (urgency.value === 'urgent') {
    return 'text-error'
  }
  if (urgency.value === 'warning') {
    return 'text-warning'
  }
  return 'text-highlighted'
})

const iconClass = computed(() => {
  if (urgency.value === 'urgent') {
    return 'text-error'
  }
  if (urgency.value === 'warning') {
    return 'text-warning'
  }
  return 'text-primary'
})
</script>

<template>
  <section
    class="rounded-xl border p-3 sm:p-4"
    :class="shellClass"
    role="timer"
    :aria-label="remainingAria"
  >
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ remainingAria }}
    </p>

    <div class="flex items-center justify-center gap-1.5">
      <UIcon
        name="i-lucide-timer"
        class="size-4 shrink-0"
        :class="iconClass"
      />
      <p class="text-xs font-semibold tracking-wide text-highlighted">
        {{ $t('pages.offerPreview.expiresIn') }}
      </p>
    </div>

    <div class="mt-3 flex items-stretch justify-center gap-1 sm:gap-2">
      <template
        v-for="(unit, index) in units"
        :key="unit.key"
      >
        <div
          class="flex min-w-0 flex-1 flex-col items-center rounded-lg bg-default px-1.5 py-1.5 shadow-sm sm:min-w-14 sm:flex-none sm:px-2.5 sm:py-2"
        >
          <span
            class="text-xl font-bold tabular-nums leading-none sm:text-2xl"
            :class="numberClass"
            aria-hidden="true"
          >
            {{ unit.value }}
          </span>
          <span class="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted sm:text-[10px]">
            {{ unit.label }}
          </span>
        </div>
        <div
          v-if="index < units.length - 1"
          class="hidden items-center self-center pb-3 text-lg font-bold text-muted sm:flex sm:text-xl"
          aria-hidden="true"
        >
          :
        </div>
      </template>
    </div>

    <p class="mt-2.5 text-center text-xs text-muted">
      {{ $t('pages.offerPreview.expiresAt', { datetime: expiresAtLabel }) }}
    </p>
  </section>
</template>
