<script setup lang="ts">
import { CAMPAIGN_NAME_MAX } from '~/composables/useCampaignWizard'

const wizard = useCampaignWizard()
const { t } = useI18n()

const title = computed(() => {
  if (wizard.type === 'announcement') {
    return t('pages.campaigns.wizard.setupTitleAnnouncement')
  }
  if (wizard.type === 'newsletter') {
    return t('pages.campaigns.wizard.setupTitleNewsletter')
  }
  return t('pages.campaigns.wizard.setupTitle')
})
</script>

<template>
  <div class="contents">
    <section class="rounded-2xl bg-default p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ title }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ t('pages.campaigns.wizard.setupSubtitle') }}
      </p>

      <div class="mt-8">
        <div class="mb-1.5 flex items-center justify-between gap-3">
          <label
            for="campaign-name"
            class="text-sm font-medium text-highlighted"
          >
            {{ t('pages.campaigns.name') }}
          </label>
          <span class="text-xs tabular-nums text-dimmed">
            {{ t('pages.campaigns.wizard.nameCount', { count: wizard.name.length, max: CAMPAIGN_NAME_MAX }) }}
          </span>
        </div>
        <UInput
          id="campaign-name"
          v-model="wizard.name"
          :maxlength="CAMPAIGN_NAME_MAX"
          class="w-full"
          size="lg"
        />
        <p class="mt-1.5 text-xs text-dimmed">
          {{ t('pages.campaigns.wizard.nameHint') }}
        </p>
        <p
          v-if="wizard.fieldError('name')"
          class="mt-1 text-sm text-error"
        >
          {{ wizard.fieldError('name') }}
        </p>
      </div>

      <div class="mt-8 flex items-center justify-between border-t border-default pt-5">
        <UButton
          variant="ghost"
          color="neutral"
          :label="t('pages.campaigns.wizard.cancel')"
          @click="wizard.onCancel"
        />
        <UButton
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          :label="t('pages.campaigns.wizard.continueAudience')"
          :loading="wizard.saving"
          @click="wizard.onNext"
        />
      </div>
    </section>

    <MarketingWizardCampaignWizardAside :eyebrow="t('pages.campaigns.wizard.namesEyebrow')">
      <p class="text-sm leading-relaxed text-white/80">
        {{ t('pages.campaigns.wizard.namesBody') }}
      </p>
      <ul class="mt-5 flex flex-col gap-2.5 text-sm">
        <li class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="mt-0.5 size-4 shrink-0 text-success"
          />
          <span>{{ t('pages.campaigns.wizard.namesGood1') }}</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="mt-0.5 size-4 shrink-0 text-success"
          />
          <span>{{ t('pages.campaigns.wizard.namesGood2') }}</span>
        </li>
        <li class="flex items-start gap-2 text-white/70">
          <UIcon
            name="i-lucide-x"
            class="mt-0.5 size-4 shrink-0 text-error"
          />
          <span>{{ t('pages.campaigns.wizard.namesBad') }}</span>
        </li>
      </ul>
    </MarketingWizardCampaignWizardAside>
  </div>
</template>
