<script setup lang="ts">
import { MARKETING_PLAYBOOK_KINDS } from '~/types/settings'
import type { ApiMarketingSettings, MarketingPlaybookKind } from '~/types/settings'

const props = defineProps<{
  settings: ApiMarketingSettings | null
  pending: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, load, submit } = useMarketingSettingsForm()

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function hasKind(kind: MarketingPlaybookKind) {
  return form.marketing_exclude_active_playbook_kinds.includes(kind)
}

function toggleKind(kind: MarketingPlaybookKind, checked: boolean | 'indeterminate') {
  const kinds = form.marketing_exclude_active_playbook_kinds.filter(k => k !== kind)
  if (checked === true) {
    kinds.push(kind)
  }
  form.marketing_exclude_active_playbook_kinds = kinds
}

watch(
  () => props.settings,
  (settings) => {
    if (settings) {
      load(settings)
    }
  },
  { immediate: true }
)

async function onSubmit() {
  const saved = await submit()

  if (!saved) {
    return
  }

  load(saved)

  toast.add({
    title: t('forms.settings.saveSuccessMessage'),
    color: 'success'
  })
}
</script>

<template>
  <div
    v-if="pending"
    class="flex items-center justify-center py-16"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin text-dimmed"
    />
  </div>

  <form
    v-else
    class="flex flex-col gap-5"
    @submit.prevent="onSubmit"
  >
    <UFormField
      :label="t('forms.marketingSettings.frequencyCap')"
      :help="t('forms.marketingSettings.frequencyCapHelp')"
      name="marketing_frequency_cap_count"
      required
      :error="fieldError('marketing_frequency_cap_count') || fieldError('marketing_frequency_cap_days')"
    >
      <div class="flex items-center gap-3">
        <UInput
          v-model.number="form.marketing_frequency_cap_count"
          type="number"
          min="0"
          class="w-28 shrink-0"
        />
        <span class="text-sm text-dimmed">{{ t('forms.marketingSettings.messagesPer') }}</span>
        <UInput
          v-model.number="form.marketing_frequency_cap_days"
          type="number"
          min="1"
          class="w-28 shrink-0"
        />
        <span class="text-sm text-dimmed">{{ t('forms.marketingSettings.days') }}</span>
      </div>
    </UFormField>

    <UFormField
      :label="t('forms.marketingSettings.newsletterBypassesCap')"
      :help="t('forms.marketingSettings.newsletterBypassesCapHelp')"
      name="marketing_newsletter_bypasses_cap"
      :error="fieldError('marketing_newsletter_bypasses_cap')"
    >
      <USwitch v-model="form.marketing_newsletter_bypasses_cap" />
    </UFormField>

    <UFormField
      :label="t('forms.marketingSettings.announcementApprovalRequired')"
      :help="t('forms.marketingSettings.announcementApprovalRequiredHelp')"
      name="announcement_approval_required"
      :error="fieldError('announcement_approval_required')"
    >
      <USwitch v-model="form.announcement_approval_required" />
    </UFormField>

    <UFormField
      :label="t('forms.marketingSettings.excludeDelinquent')"
      :help="t('forms.marketingSettings.excludeDelinquentHelp')"
      name="marketing_exclude_delinquent"
      :error="fieldError('marketing_exclude_delinquent')"
    >
      <USwitch v-model="form.marketing_exclude_delinquent" />
    </UFormField>

    <UFormField
      :label="t('forms.marketingSettings.excludePlaybookKinds')"
      :help="t('forms.marketingSettings.excludePlaybookKindsHelp')"
      name="marketing_exclude_active_playbook_kinds"
      :error="fieldError('marketing_exclude_active_playbook_kinds')"
    >
      <div class="flex flex-col gap-2">
        <UCheckbox
          v-for="kind in MARKETING_PLAYBOOK_KINDS"
          :key="kind"
          :model-value="hasKind(kind)"
          :label="t(`forms.marketingSettings.playbookKinds.${kind}`)"
          @update:model-value="toggleKind(kind, $event)"
        />
      </div>
    </UFormField>

    <UFormField
      :label="t('forms.marketingSettings.approvalThreshold')"
      :help="t('forms.marketingSettings.approvalThresholdHelp')"
      name="marketing_approval_threshold"
      required
      :error="fieldError('marketing_approval_threshold')"
    >
      <UInput
        v-model.number="form.marketing_approval_threshold"
        type="number"
        min="0"
        class="w-40"
      />
    </UFormField>

    <div
      v-if="error && !Object.keys(fieldErrors).length"
      class="rounded-lg border border-error/30 bg-error/5 p-3"
    >
      <p class="text-sm text-error">
        {{ error }}
      </p>
    </div>

    <div class="flex justify-end border-t border-default pt-5">
      <UButton
        type="submit"
        :label="t('forms.settings.save')"
        color="primary"
        :loading="submitting"
      />
    </div>
  </form>
</template>
