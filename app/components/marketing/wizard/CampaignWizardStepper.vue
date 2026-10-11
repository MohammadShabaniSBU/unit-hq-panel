<script setup lang="ts">
const wizard = useCampaignWizard()
const { t } = useI18n()

const setupHint = computed(() => {
  if (wizard.type === 'announcement') {
    return t('pages.campaigns.wizard.setupTitleAnnouncement')
  }
  if (wizard.type === 'newsletter') {
    return t('pages.campaigns.wizard.setupTitleNewsletter')
  }
  return t('pages.campaigns.wizard.hints.setup')
})

const steps = computed(() => [
  { label: t('pages.campaigns.steps.setup'), hint: setupHint.value },
  { label: t('pages.campaigns.steps.audience'), hint: t('pages.campaigns.wizard.hints.audience') },
  { label: t('pages.campaigns.steps.content'), hint: t('pages.campaigns.wizard.hints.content') },
  { label: t('pages.campaigns.steps.schedule'), hint: t('pages.campaigns.wizard.hints.schedule') },
  { label: t('pages.campaigns.steps.review'), hint: t('pages.campaigns.wizard.hints.review') }
])

const current = computed(() => steps.value[wizard.step] ?? steps.value[0])

function state(index: number): 'current' | 'done' | 'upcoming' {
  if (index === wizard.step) {
    return 'current'
  }
  if (index < wizard.maxReached) {
    return 'done'
  }
  return 'upcoming'
}

function sublabel(index: number) {
  const summary = wizard.summaries[index] ?? ''
  const hint = steps.value[index]?.hint ?? ''
  if (index === wizard.step) {
    return hint
  }
  if (index <= wizard.maxReached && summary !== '') {
    return summary
  }
  return hint
}

function onSelect(index: number) {
  if (index <= wizard.maxReached) {
    wizard.goTo(index)
  }
}

function circleClass(state: 'current' | 'done' | 'upcoming') {
  if (state === 'current') {
    return 'bg-primary text-white ring-4 ring-primary/20'
  }
  if (state === 'done') {
    return 'bg-cosmos-900 text-white'
  }
  return 'border border-default bg-default text-dimmed'
}
</script>

<template>
  <nav :aria-label="t('pages.campaigns.wizard.stepsLabel')">
    <div class="flex items-center gap-3 xl:hidden">
      <ol class="flex items-center gap-2">
        <li
          v-for="(item, index) in steps"
          :key="item.label"
        >
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded-full p-0 text-xs font-semibold"
            :class="circleClass(state(index))"
            :aria-current="state(index) === 'current' ? 'step' : undefined"
            :disabled="index > wizard.maxReached"
            @click="onSelect(index)"
          >
            <UIcon
              v-if="state(index) === 'done'"
              name="i-lucide-check"
              class="size-3.5"
            />
            <template v-else>
              {{ index + 1 }}
            </template>
          </button>
        </li>
      </ol>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-highlighted">
          {{ current?.label }}
        </p>
        <p class="truncate text-xs text-dimmed">
          {{ sublabel(wizard.step) }}
        </p>
      </div>
    </div>

    <ol class="hidden xl:flex xl:flex-col">
      <li
        v-for="(item, index) in steps"
        :key="item.label"
        class="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3"
      >
        <div class="flex items-center justify-center">
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded-full p-0 text-xs font-semibold"
            :class="circleClass(state(index))"
            :aria-current="state(index) === 'current' ? 'step' : undefined"
            :disabled="index > wizard.maxReached"
            @click="onSelect(index)"
          >
            <UIcon
              v-if="state(index) === 'done'"
              name="i-lucide-check"
              class="size-3.5"
            />
            <template v-else>
              {{ index + 1 }}
            </template>
          </button>
        </div>
        <button
          type="button"
          class="min-w-0 p-0 text-left"
          :disabled="index > wizard.maxReached"
          @click="onSelect(index)"
        >
          <p
            class="text-sm leading-5"
            :class="state(index) === 'upcoming' ? 'text-dimmed' : 'font-semibold text-highlighted'"
          >
            {{ item.label }}
          </p>
          <p class="truncate text-xs leading-4 text-dimmed">
            {{ sublabel(index) }}
          </p>
        </button>
        <div
          v-if="index < steps.length - 1"
          class="flex h-5 justify-center"
        >
          <span class="w-px bg-default" />
        </div>
      </li>
    </ol>
  </nav>
</template>
