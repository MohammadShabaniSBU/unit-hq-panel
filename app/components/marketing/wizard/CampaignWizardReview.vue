<script setup lang="ts">
const wizard = useCampaignWizard()
const { t } = useI18n()

const noRecipients = computed(() => wizard.audience != null && wizard.audience.count === 0)

const testLabel = computed(() => {
  const count = wizard.testTo.length
  if (count === 1) {
    return t('pages.campaigns.wizard.sendTestOne')
  }
  return t('pages.campaigns.wizard.sendTestMany', { count })
})

const checkLabel = computed(() => ({
  named: t('pages.campaigns.wizard.checkNamed'),
  audience: t('pages.campaigns.wizard.checkAudience'),
  content: t('pages.campaigns.wizard.checkContent'),
  schedule: t('pages.campaigns.wizard.checkSchedule'),
  test: t('pages.campaigns.wizard.checkTest')
}))

function isMe(value: string) {
  return wizard.myEmail !== '' && value.toLowerCase() === wizard.myEmail.toLowerCase()
}
</script>

<template>
  <div class="contents">
    <section class="rounded-2xl bg-default p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.campaigns.wizard.reviewTitle') }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ t('pages.campaigns.wizard.reviewSubtitle') }}
      </p>

      <p
        v-if="wizard.fieldError('status')"
        class="mt-4 text-sm text-error"
      >
        {{ wizard.fieldError('status') }}
      </p>

      <div
        v-if="noRecipients"
        class="mt-6 flex flex-col gap-3 rounded-xl border border-error/30 bg-error/10 p-4 sm:flex-row sm:items-center"
      >
        <UIcon
          name="i-lucide-triangle-alert"
          class="size-5 shrink-0 text-error"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted">
            {{ t('pages.campaigns.wizard.noRecipientsTitle') }}
          </p>
          <p class="mt-0.5 text-sm text-muted">
            {{ t('pages.campaigns.wizard.noRecipientsBody') }}
          </p>
        </div>
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          :label="t('pages.campaigns.wizard.fixAudience')"
          @click="wizard.goTo(1)"
        />
      </div>

      <dl class="mt-6 divide-y divide-default">
        <div class="flex items-start justify-between gap-4 py-4">
          <div>
            <dt class="text-xs text-dimmed">
              {{ t('pages.campaigns.name') }}
            </dt>
            <dd class="mt-1 text-sm font-medium text-highlighted">
              {{ wizard.name }}
            </dd>
          </div>
          <button
            type="button"
            class="text-sm font-medium text-primary"
            @click="wizard.goTo(0)"
          >
            {{ t('pages.campaigns.wizard.edit') }}
          </button>
        </div>
        <div class="flex items-start justify-between gap-4 py-4">
          <div>
            <dt class="text-xs text-dimmed">
              {{ t('pages.campaigns.steps.audience') }}
            </dt>
            <dd class="mt-1 text-sm font-medium text-highlighted">
              {{ wizard.audienceSummary || t('pages.campaigns.wizard.audienceMissing') }}
            </dd>
            <dd
              class="mt-0.5 flex items-center gap-1.5 text-sm"
              :class="noRecipients ? 'text-error' : 'text-muted'"
            >
              <span
                class="size-1.5 rounded-full"
                :class="noRecipients ? 'bg-error' : 'bg-muted'"
              />
              {{ wizard.audienceDetail }}
            </dd>
          </div>
          <button
            type="button"
            class="text-sm font-medium text-primary"
            @click="wizard.goTo(1)"
          >
            {{ t('pages.campaigns.wizard.edit') }}
          </button>
        </div>
        <div class="flex items-start justify-between gap-4 py-4">
          <div>
            <dt class="text-xs text-dimmed">
              {{ t('pages.campaigns.steps.content') }}
            </dt>
            <dd class="mt-1 text-sm font-medium text-highlighted">
              {{ wizard.contentSummary || t('pages.campaigns.wizard.contentMissing') }}
            </dd>
            <dd class="mt-0.5 text-sm text-muted">
              {{ wizard.contentDetail }}
            </dd>
          </div>
          <button
            type="button"
            class="text-sm font-medium text-primary"
            @click="wizard.goTo(2)"
          >
            {{ t('pages.campaigns.wizard.edit') }}
          </button>
        </div>
        <div class="flex items-start justify-between gap-4 py-4">
          <div>
            <dt class="text-xs text-dimmed">
              {{ t('pages.campaigns.steps.schedule') }}
            </dt>
            <dd class="mt-1 text-sm font-medium text-highlighted">
              {{ wizard.scheduleHeadline || t('pages.campaigns.wizard.pickDate') }}
            </dd>
            <dd class="mt-0.5 text-sm text-muted">
              {{ wizard.urgent && wizard.urgentConfirmed
                ? t('pages.campaigns.wizard.quietIgnored')
                : t('pages.campaigns.wizard.quietRespected') }}
            </dd>
          </div>
          <button
            type="button"
            class="text-sm font-medium text-primary"
            @click="wizard.goTo(3)"
          >
            {{ t('pages.campaigns.wizard.edit') }}
          </button>
        </div>
      </dl>

      <ul
        v-if="wizard.audience?.approval_required"
        class="mt-2 flex flex-col gap-1 text-sm text-muted"
      >
        <li
          v-for="reason in wizard.audience.approval_reasons"
          :key="reason"
        >
          {{ t('pages.campaigns.reviewApproval', { reason: t(`pages.campaigns.approvalReasons.${reason}`) }) }}
        </li>
      </ul>

      <div class="mt-2 rounded-xl bg-muted/50 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-highlighted">
              {{ t('pages.campaigns.wizard.sendTestTitle') }}
            </p>
            <p class="text-xs text-dimmed">
              {{ t('pages.campaigns.wizard.sendTestHint') }}
            </p>
          </div>
          <div class="inline-flex rounded-full bg-default p-0.5 shadow-sm">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
              :class="wizard.testChannel === 'email' ? 'bg-elevated text-highlighted' : 'text-dimmed'"
              :disabled="!wizard.emailOn"
              @click="wizard.testChannel = 'email'"
            >
              {{ t('pages.campaigns.channels.email') }}
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
              :class="wizard.testChannel === 'sms' ? 'bg-elevated text-highlighted' : 'text-dimmed'"
              :disabled="!wizard.smsOn"
              @click="wizard.testChannel = 'sms'"
            >
              {{ t('pages.campaigns.channels.sms') }}
            </button>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span
            v-for="recipient in wizard.testTo"
            :key="recipient"
            class="inline-flex items-center gap-1 rounded-full border border-default bg-default px-2.5 py-1 text-sm"
          >
            {{ recipient }}
            <span
              v-if="isMe(recipient)"
              class="text-dimmed"
            >{{ t('pages.campaigns.wizard.you') }}</span>
            <button
              type="button"
              class="text-dimmed hover:text-highlighted"
              :aria-label="t('pages.campaigns.wizard.removeRecipient')"
              @click="wizard.removeTestRecipient(recipient)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-3.5"
              />
            </button>
          </span>
          <UInput
            v-model="wizard.testInput"
            class="min-w-48 flex-1"
            :placeholder="t('pages.campaigns.wizard.addColleague')"
            :disabled="wizard.testTo.length >= 5"
            @keydown.enter.prevent="wizard.addTestRecipient()"
          />
          <UButton
            size="sm"
            variant="outline"
            color="neutral"
            :label="t('pages.campaigns.addRecipient')"
            :disabled="wizard.testTo.length >= 5"
            @click="wizard.addTestRecipient()"
          />
        </div>
        <p
          v-if="wizard.fieldError('to')"
          class="mt-2 text-sm text-error"
        >
          {{ wizard.fieldError('to') }}
        </p>
        <UButton
          class="mt-3"
          variant="outline"
          color="neutral"
          icon="i-lucide-send"
          :label="testLabel"
          :loading="wizard.testing"
          :disabled="wizard.testTo.length === 0"
          @click="wizard.onTestSend"
        />
      </div>

      <ul
        v-if="wizard.warnings.length"
        class="mt-4 flex flex-col gap-1 text-sm text-dimmed"
      >
        <li
          v-for="warning in wizard.warnings"
          :key="warning"
        >
          {{ warning }}
        </li>
      </ul>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-5">
        <UButton
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-arrow-left"
          :label="t('pages.campaigns.back')"
          @click="wizard.onBack"
        />
        <div class="flex items-center gap-3">
          <p
            v-if="wizard.submitHint"
            class="text-sm text-dimmed"
          >
            {{ wizard.submitHint }}
          </p>
          <UButton
            :color="wizard.canSubmit ? 'primary' : 'neutral'"
            :variant="wizard.canSubmit ? 'solid' : 'soft'"
            :label="wizard.submitLabel"
            :loading="wizard.saving"
            :disabled="!wizard.canSubmit"
            @click="wizard.onSubmit"
          />
        </div>
      </div>
    </section>

    <MarketingWizardCampaignWizardAside :eyebrow="t('pages.campaigns.wizard.readyEyebrow')">
      <p class="text-lg font-semibold">
        {{ t('pages.campaigns.wizard.checksPass', { passed: wizard.requiredChecksPassed, total: 4 }) }}
      </p>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          class="h-full rounded-full bg-primary"
          :style="{ width: `${(wizard.requiredChecksPassed / 4) * 100}%` }"
        />
      </div>
      <ul class="mt-4 flex flex-col gap-2 text-sm">
        <li
          v-for="check in wizard.checks"
          :key="check.key"
          class="flex items-center gap-2"
          :class="check.pass ? 'text-white' : check.optional ? 'text-white/50' : 'text-error'"
        >
          <UIcon
            v-if="check.pass"
            name="i-lucide-check"
            class="size-4 text-success"
          />
          <UIcon
            v-else-if="check.optional"
            name="i-lucide-circle"
            class="size-4"
          />
          <UIcon
            v-else
            name="i-lucide-x"
            class="size-4"
          />
          <span>{{ checkLabel[check.key] }}</span>
        </li>
      </ul>
    </MarketingWizardCampaignWizardAside>
  </div>
</template>
