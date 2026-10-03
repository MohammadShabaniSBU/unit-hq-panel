<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const STEP = 30
const WINDOW = 3
const TURN_MS = 560
const TURN_EASING = 'cubic-bezier(0.34, 1.32, 0.52, 1)'
const ANCHOR_UTC = Date.UTC(2000, 0, 1)

const props = defineProps<{
  value: CalendarDate
  minValue: CalendarDate
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [date: CalendarDate]
}>()

const { t, locale } = useI18n()
const wheelEl = useTemplateRef<HTMLElement>('wheel')

type JumpPhase = 'idle' | 'out' | 'in'

const wheelIndex = ref(dayIndex(props.value))
const rendered = ref<Array<CalendarDate>>(datesAround(props.value))
const jumpPhase = ref<JumpPhase>('idle')
const suspendMotion = ref(false)

let motionGeneration = 0
let pruneTimer: ReturnType<typeof setTimeout> | null = null
let alive = true

const formatters = computed(() => {
  const timeZone = 'UTC'
  const tag = locale.value
  return {
    weekdayShort: new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone }),
    weekdayLong: new Intl.DateTimeFormat(tag, { weekday: 'long', timeZone }),
    monthShort: new Intl.DateTimeFormat(tag, { month: 'short', timeZone }),
    hubDate: new Intl.DateTimeFormat(tag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone
    }),
    aria: new Intl.DateTimeFormat(tag, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone
    })
  }
})

const hubWeekday = computed(() => formatters.value.weekdayLong.format(civilDate(props.value)))
const hubFullDate = computed(() => formatters.value.hubDate.format(civilDate(props.value)))
const wheelTransform = computed(() => `rotate(${wheelIndex.value * STEP}deg)`)

watch(() => dayIndex(props.value), (next) => {
  const delta = next - wheelIndex.value
  if (delta === 0) {
    return
  }

  const token = ++motionGeneration
  clearPrune()

  if (Math.abs(delta) > 2) {
    void runJump(next, token)
    return
  }

  runStep(next, token)
})

onScopeDispose(() => {
  alive = false
  clearPrune()
})

function dayIndex(date: CalendarDate): number {
  return Math.round((Date.UTC(date.year, date.month - 1, date.day) - ANCHOR_UTC) / 86_400_000)
}

function isoDate(date: CalendarDate): string {
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${date.year}-${month}-${day}`
}

function civilDate(date: CalendarDate): Date {
  return date.toDate('UTC')
}

function datesAround(center: CalendarDate): Array<CalendarDate> {
  const dates: Array<CalendarDate> = []
  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    dates.push(center.add({ days: offset }))
  }
  return dates
}

function mergeDates(current: Array<CalendarDate>, extra: Array<CalendarDate>): Array<CalendarDate> {
  const byKey = new Map<string, CalendarDate>()
  for (const date of current) {
    byKey.set(isoDate(date), date)
  }
  for (const date of extra) {
    byKey.set(isoDate(date), date)
  }
  return [...byKey.values()].sort((left, right) => left.compare(right))
}

function distanceOf(date: CalendarDate): number {
  return Math.abs(dayIndex(date) - dayIndex(props.value))
}

function opacityFor(date: CalendarDate): string {
  if (jumpPhase.value === 'out') {
    return '0'
  }

  const distance = distanceOf(date)
  if (distance <= 1) {
    return '1'
  }
  if (distance === 2) {
    return '0.6'
  }
  return '0'
}

function isSelected(date: CalendarDate): boolean {
  return date.compare(props.value) === 0
}

function isBeforeMin(date: CalendarDate): boolean {
  return date.compare(props.minValue) < 0
}

function dayStyle(date: CalendarDate): Record<string, string> {
  const hidden = distanceOf(date) >= WINDOW
  return {
    transform: `rotate(${-dayIndex(date) * STEP}deg) translateY(116px)`,
    opacity: opacityFor(date),
    pointerEvents: hidden ? 'none' : 'auto'
  }
}

function labelStyle(date: CalendarDate): Record<string, string> {
  const delta = dayIndex(date) - wheelIndex.value
  return {
    transform: `rotate(${delta * STEP}deg)`
  }
}

function tickStyle(date: CalendarDate): Record<string, string> {
  return {
    transform: `rotate(${-(dayIndex(date) + 0.5) * STEP}deg) translateY(141px)`
  }
}

function weekdayLabel(date: CalendarDate): string {
  return formatters.value.weekdayShort.format(civilDate(date)).toLocaleUpperCase(locale.value)
}

function monthLabel(date: CalendarDate): string {
  return formatters.value.monthShort.format(civilDate(date)).replace(/\./g, '').toLocaleUpperCase(locale.value)
}

function ariaLabel(date: CalendarDate): string {
  return formatters.value.aria.format(civilDate(date))
}

function selectDate(date: CalendarDate) {
  if (props.disabled || isBeforeMin(date) || date.compare(props.value) === 0) {
    return
  }

  emit('change', date)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return
  }

  event.preventDefault()
  const delta = event.key === 'ArrowLeft' ? -1 : 1
  selectDate(props.value.add({ days: delta }))
}

function onWheelTransitionEnd(event: TransitionEvent) {
  if (event.target !== wheelEl.value || event.propertyName !== 'transform') {
    return
  }
  if (!alive || jumpPhase.value !== 'idle' || wheelIndex.value !== dayIndex(props.value)) {
    return
  }

  rendered.value = datesAround(props.value)
}

function runStep(next: number, token: number) {
  suspendMotion.value = false
  jumpPhase.value = 'idle'
  rendered.value = mergeDates(rendered.value, datesAround(props.value))
  wheelIndex.value = next
  schedulePrune(token)
}

async function runJump(next: number, token: number) {
  jumpPhase.value = 'out'
  await wait(150)
  if (!stillCurrent(token)) {
    return
  }

  suspendMotion.value = true
  rendered.value = datesAround(props.value)
  wheelIndex.value = next
  await nextTick()
  if (!stillCurrent(token)) {
    return
  }

  wheelEl.value?.offsetHeight
  suspendMotion.value = false
  await nextFrame()
  await nextFrame()
  if (!stillCurrent(token)) {
    return
  }

  jumpPhase.value = 'in'
  await wait(200)
  if (!stillCurrent(token)) {
    return
  }

  jumpPhase.value = 'idle'
}

function schedulePrune(token: number) {
  clearPrune()
  pruneTimer = setTimeout(() => {
    pruneTimer = null
    if (!stillCurrent(token) || jumpPhase.value !== 'idle') {
      return
    }
    rendered.value = datesAround(props.value)
  }, motionDelay())
}

function clearPrune() {
  if (pruneTimer) {
    clearTimeout(pruneTimer)
    pruneTimer = null
  }
}

function stillCurrent(token: number): boolean {
  return alive && token === motionGeneration
}

function motionDelay(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 360
  }
  return TURN_MS
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })
}
</script>

<template>
  <div
    class="day-dial"
    :class="{
      'is-fading-out': jumpPhase === 'out',
      'is-fading-in': jumpPhase === 'in',
      'is-suspended': suspendMotion
    }"
    role="group"
    tabindex="0"
    :aria-label="t('pages.unitMap.selectDate')"
    :aria-disabled="disabled || undefined"
    @keydown="onKeydown"
  >
    <div class="day-dial__ring" />
    <div class="day-dial__hub" />
    <div class="day-dial__slot" />

    <div
      ref="wheel"
      class="day-dial__wheel"
      :style="{ transform: wheelTransform, '--day-dial-turn': `${TURN_MS}ms`, '--day-dial-ease': TURN_EASING }"
      @transitionend="onWheelTransitionEnd"
    >
      <span
        v-for="date in rendered"
        :key="`tick-${isoDate(date)}`"
        class="day-dial__tick"
        :style="tickStyle(date)"
      />
      <button
        v-for="date in rendered"
        :key="isoDate(date)"
        type="button"
        class="day-dial__day"
        :class="{ 'is-selected': isSelected(date) }"
        :style="dayStyle(date)"
        :disabled="disabled || isBeforeMin(date)"
        :tabindex="distanceOf(date) >= WINDOW ? -1 : undefined"
        :aria-hidden="distanceOf(date) >= WINDOW || undefined"
        :aria-current="isSelected(date) ? 'date' : undefined"
        :aria-label="ariaLabel(date)"
        @click="selectDate(date)"
      >
        <span
          class="day-dial__label"
          :style="labelStyle(date)"
        >
          <span class="day-dial__dow">{{ weekdayLabel(date) }}</span>
          <span class="day-dial__num">{{ date.day }}</span>
          <span class="day-dial__mon">{{ monthLabel(date) }}</span>
        </span>
      </button>
    </div>

    <div class="day-dial__pointer" />
    <div class="day-dial__copy">
      <div class="day-dial__copy-dow">
        {{ hubWeekday }}
      </div>
      <div class="day-dial__copy-date">
        {{ hubFullDate }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-dial {
  position: relative;
  width: 320px;
  height: 164px;
  margin-top: -1px;
  overflow: hidden;
  outline: none;
  user-select: none;
}

.day-dial:focus-visible .day-dial__slot {
  box-shadow: 0 0 0 2px #f26b3a;
}

.day-dial__ring {
  position: absolute;
  top: -150px;
  left: 10px;
  width: 300px;
  height: 300px;
  border: 1px solid var(--ui-border);
  border-radius: 50%;
  background: var(--ui-bg);
  box-shadow: 0 8px 22px rgb(27 26 58 / 0.08);
}

.day-dial__hub {
  position: absolute;
  top: -78px;
  left: 82px;
  width: 156px;
  height: 156px;
  border: 1px solid #e3e0ee;
  border-radius: 50%;
  background: #f1f0f7;
}

.day-dial__slot {
  position: absolute;
  top: 80px;
  left: 133px;
  z-index: 2;
  width: 54px;
  height: 72px;
  border-radius: 13px;
  background: #1b1a3a;
}

.day-dial__wheel {
  position: absolute;
  top: -150px;
  left: 10px;
  z-index: 3;
  width: 300px;
  height: 300px;
  transform-origin: 150px 150px;
  transition: transform var(--day-dial-turn) var(--day-dial-ease);
}

.day-dial__tick {
  position: absolute;
  top: 147px;
  left: 149px;
  width: 2px;
  height: 6px;
  background: #cfcbe0;
  transform-origin: center center;
}

.day-dial__day {
  position: absolute;
  top: 118px;
  left: 125px;
  width: 50px;
  height: 64px;
  padding: 0;
  border: 0;
  border-radius: 11px;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transform-origin: center center;
  transition: opacity 360ms ease, background-color 300ms ease;
}

.day-dial__day:hover:not(:disabled):not(.is-selected) {
  background: rgb(27 26 58 / 0.06);
}

.day-dial__day:disabled {
  cursor: default;
}

.day-dial__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform var(--day-dial-turn, 560ms) var(--day-dial-ease, cubic-bezier(0.34, 1.32, 0.52, 1));
}

.day-dial__dow,
.day-dial__num,
.day-dial__mon {
  transition: color 300ms ease;
}

.day-dial__dow {
  color: #66637f;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
}

.day-dial__num {
  color: #1b1a3a;
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.day-dial__mon {
  color: #8a86a6;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
}

.day-dial__day.is-selected .day-dial__dow {
  color: #c9c6dd;
}

.day-dial__day.is-selected .day-dial__num {
  color: #fff;
}

.day-dial__day.is-selected .day-dial__mon {
  color: #ff9466;
}

.day-dial__pointer {
  position: absolute;
  top: 153px;
  left: 154px;
  z-index: 4;
  width: 0;
  height: 0;
  border-right: 6px solid transparent;
  border-bottom: 9px solid #f26b3a;
  border-left: 6px solid transparent;
}

.day-dial__copy {
  position: absolute;
  top: 16px;
  right: 0;
  left: 0;
  z-index: 4;
  text-align: center;
  pointer-events: none;
}

.day-dial__copy-dow {
  color: #4a4766;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
}

.day-dial__copy-date {
  color: #1b1a3a;
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.day-dial.is-fading-out .day-dial__day {
  transition: opacity 150ms ease, background-color 300ms ease;
}

.day-dial.is-fading-in .day-dial__day {
  transition: opacity 200ms ease, background-color 300ms ease;
}

.day-dial.is-suspended .day-dial__wheel,
.day-dial.is-suspended .day-dial__label {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .day-dial__wheel,
  .day-dial__label {
    transition: none;
  }
}
</style>
