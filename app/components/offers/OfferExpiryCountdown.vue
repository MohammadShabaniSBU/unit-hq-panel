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
    class="rounded-2xl border p-5 sm:p-6"
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

    <div class="flex items-center justify-center gap-2">
      <UIcon
        name="i-lucide-timer"
        class="size-5 shrink-0 sm:size-6"
        :class="iconClass"
      />
      <p class="text-sm font-semibold tracking-wide text-highlighted sm:text-base">
        {{ $t('pages.offerPreview.expiresIn') }}
      </p>
    </div>

    <div class="mt-5 flex items-stretch justify-center gap-1.5 sm:gap-3">
      <template
        v-for="(unit, index) in units"
        :key="unit.key"
      >
        <div
          class="flex min-w-0 flex-1 flex-col items-center rounded-xl bg-default px-2 py-3 shadow-sm sm:min-w-[5.5rem] sm:flex-none sm:px-4 sm:py-4"
        >
          <span
            class="text-3xl font-bold tabular-nums leading-none sm:text-5xl"
            :class="numberClass"
            aria-hidden="true"
          >
            {{ unit.value }}
          </span>
          <span class="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted sm:text-xs">
            {{ unit.label }}
          </span>
        </div>
        <div
          v-if="index < units.length - 1"
          class="hidden items-center self-center pb-5 text-2xl font-bold text-muted sm:flex sm:text-4xl"
          aria-hidden="true"
        >
          :
        </div>
      </template>
    </div>

    <p class="mt-4 text-center text-sm text-muted sm:text-base">
      {{ $t('pages.offerPreview.expiresAt', { datetime: expiresAtLabel }) }}
    </p>
  </section>
</template>
