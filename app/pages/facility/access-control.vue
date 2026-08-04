<script setup lang="ts">
const { t } = useI18n()
const { isCompanyWide } = usePermissions()
const { siteOptions } = useSiteFilterOptions(() => t('access.events.allSites'))

const siteId = ref<number | null>(null)

watch(siteOptions, (options) => {
  if (options.length === 0) {
    return
  }
  if (!isCompanyWide.value && siteId.value === null) {
    siteId.value = options[0]!.value
  }
}, { immediate: true })

const filters = computed(() => ({
  site_id: siteId.value,
  denied_only: false
}))
</script>

<template>
  <UContainer class="py-8">
    <UPageHeader :title="t('pages.accessControl.title')" />
    <p class="mt-1 text-sm text-dimmed">
      {{ t('pages.accessControl.subtitle') }}
    </p>

    <div class="mt-6 max-w-xs">
      <UFormField :label="t('access.events.siteFilter')">
        <USelect
          v-model="siteId"
          :items="siteOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="mt-6">
      <AccessAccessEventsTable
        url="/api/access/events"
        :filters="filters"
        :show-contact="true"
      />
    </div>
  </UContainer>
</template>
