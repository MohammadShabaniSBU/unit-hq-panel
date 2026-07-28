<script setup lang="ts">
const { t } = useI18n()
const { rows, pending, error, refresh } = useSitesStripeOverview()

function statusColor(status: string) {
  if (status === 'connected') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  return 'neutral' as const
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.paymentsTitle')"
      :subtitle="t('pages.settings.paymentsSubtitle')"
    />

    <div
      v-if="pending"
      class="flex items-center justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <SettingsLoadError
      v-else-if="error"
      :message="t('pages.settings.paymentsLoadError')"
      @retry="refresh()"
    />

    <p
      v-else-if="!rows.length"
      class="text-sm text-dimmed"
    >
      {{ t('pages.settings.paymentsNoSites') }}
    </p>

    <div
      v-else
      class="flex flex-col gap-3"
    >
      <div
        v-for="row in rows"
        :key="row.id"
        class="flex items-center justify-between rounded-lg border border-default px-4 py-3"
      >
        <div class="flex items-center gap-3">
          <p class="text-sm font-medium text-highlighted">
            {{ row.name }}
          </p>
          <UBadge
            :color="statusColor(row.status)"
            variant="subtle"
            :label="t(`forms.stripe.status.${row.status}`)"
          />
        </div>
        <UButton
          :to="`/settings/facility/sites/${row.id}?tab=payments`"
          :label="t('pages.settings.paymentsManage')"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>
