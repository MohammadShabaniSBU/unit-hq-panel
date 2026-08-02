<script setup lang="ts">
const { t } = useI18n()
const { items: siteItems } = useOptions('/api/sites/options')

const siteId = ref<number | undefined>(undefined)

const filters = computed(() => ({
  site_id: siteId.value ?? null,
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
          :items="[{ label: t('access.events.allSites'), value: undefined }, ...siteItems]"
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
