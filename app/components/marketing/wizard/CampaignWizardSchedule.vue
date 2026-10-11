<script setup lang="ts">
const wizard = useCampaignWizard()
const { t } = useI18n()

const scheduledAtInput = useTemplateRef('scheduledAtInput')
</script>

<template>
  <div class="contents">
    <section class="rounded-2xl bg-default p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.campaigns.wizard.scheduleTitle') }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ t('pages.campaigns.wizard.scheduleSubtitle') }}
      </p>

      <div class="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
          :class="wizard.scheduleMode === 'now'
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-default bg-default hover:border-primary/40'"
          @click="wizard.scheduleMode = 'now'"
        >
          <span
            class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
            :class="wizard.scheduleMode === 'now' ? 'border-primary' : 'border-muted'"
          >
            <span
              v-if="wizard.scheduleMode === 'now'"
              class="size-2 rounded-full bg-primary"
            />
          </span>
          <span>
            <span class="block text-sm font-medium text-highlighted">
              {{ t('pages.campaigns.wizard.sendNow') }}
            </span>
            <span class="mt-0.5 block text-xs text-dimmed">
              {{ t('pages.campaigns.wizard.sendNowHint') }}
            </span>
          </span>
        </button>

        <button
          type="button"
          class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
          :class="wizard.scheduleMode === 'later'
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-default bg-default hover:border-primary/40'"
          @click="wizard.scheduleMode = 'later'"
        >
          <span
            class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
            :class="wizard.scheduleMode === 'later' ? 'border-primary' : 'border-muted'"
          >
            <span
              v-if="wizard.scheduleMode === 'later'"
              class="size-2 rounded-full bg-primary"
            />
          </span>
          <span>
            <span class="block text-sm font-medium text-highlighted">
              {{ t('pages.campaigns.wizard.scheduleLater') }}
            </span>
            <span class="mt-0.5 block text-xs text-dimmed">
              {{ t('pages.campaigns.wizard.scheduleLaterHint') }}
            </span>
          </span>
        </button>
      </div>

      <div
        v-if="wizard.scheduleMode === 'later'"
        class="mt-6 grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label class="text-sm font-medium text-highlighted">
            {{ t('pages.campaigns.wizard.date') }}
          </label>
          <UInputDate
            ref="scheduledAtInput"
            v-model="wizard.scheduledDate"
            :locale="wizard.dateFieldLocale"
            class="mt-1.5 w-full"
          >
            <template #trailing>
              <UPopover :reference="scheduledAtInput?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="t('pages.campaigns.wizard.date')"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="wizard.scheduledDate"
                    :locale="wizard.dateFieldLocale"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </div>
        <div>
          <label class="text-sm font-medium text-highlighted">
            {{ t('pages.campaigns.wizard.time') }}
          </label>
          <UInputTime
            v-model="wizard.scheduledTime"
            :locale="wizard.dateFieldLocale"
            class="mt-1.5 w-full"
          />
        </div>
      </div>
      <p
        v-if="wizard.fieldError('scheduled_at')"
        class="mt-2 text-sm text-error"
      >
        {{ wizard.fieldError('scheduled_at') }}
      </p>

      <div class="mt-6 flex gap-3 rounded-xl bg-muted/70 p-4">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-default text-muted">
          <UIcon
            name="i-lucide-moon"
            class="size-4"
          />
        </span>
        <span>
          <span class="block text-sm font-medium text-highlighted">
            {{ t('pages.campaigns.wizard.quietTitle') }}
          </span>
          <span class="mt-0.5 block text-sm text-muted">
            {{ t('pages.campaigns.scheduleWindowNote') }}
          </span>
        </span>
      </div>

      <div
        v-if="wizard.type === 'announcement'"
        class="mt-4 flex flex-col gap-2"
      >
        <UCheckbox
          v-model="wizard.urgent"
          :label="t('pages.campaigns.urgent')"
        />
        <UCheckbox
          v-if="wizard.urgent"
          v-model="wizard.urgentConfirmed"
          :label="t('pages.campaigns.urgentConfirm')"
        />
        <p
          v-if="wizard.fieldError('ignore_send_window')"
          class="text-sm text-error"
        >
          {{ wizard.fieldError('ignore_send_window') }}
        </p>
      </div>

      <div class="mt-8 flex items-center justify-between border-t border-default pt-5">
        <UButton
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-arrow-left"
          :label="t('pages.campaigns.back')"
          @click="wizard.onBack"
        />
        <UButton
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          :label="t('pages.campaigns.wizard.continueReview')"
          :loading="wizard.saving"
          @click="wizard.onNext"
        />
      </div>
    </section>

    <MarketingWizardCampaignWizardAside :eyebrow="t('pages.campaigns.wizard.goesOutEyebrow')">
      <p class="text-2xl font-semibold tracking-tight">
        {{ wizard.scheduleHeadline || t('pages.campaigns.wizard.pickDate') }}
      </p>
      <p
        v-if="wizard.scheduleRelative"
        class="mt-1 text-sm text-white/70"
      >
        {{ wizard.scheduleRelative }}
      </p>
      <div class="mt-5 grid grid-cols-7 gap-1 text-center">
        <div
          v-for="day in wizard.weekDays"
          :key="day.key"
          class="flex flex-col items-center gap-1"
        >
          <span class="text-[11px] uppercase text-white/50">{{ day.label }}</span>
          <span
            class="flex size-8 items-center justify-center rounded-full text-sm"
            :class="day.active ? 'bg-primary text-white' : 'text-white/80'"
          >
            {{ day.date }}
          </span>
        </div>
      </div>
    </MarketingWizardCampaignWizardAside>
  </div>
</template>
