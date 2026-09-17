<script setup lang="ts">
import { ATTRIBUTE_ENTITY_TYPES } from '~/types/attribute'
import type { AttributeEntityType } from '~/types/attribute'

const { t } = useI18n()

const ENTITY_ICONS: Record<AttributeEntityType, string> = {
  contact: 'i-lucide-contact',
  deal: 'i-lucide-handshake',
  offer: 'i-lucide-file-text',
  reservation: 'i-lucide-calendar-check',
  unit: 'i-lucide-box',
  contract: 'i-lucide-file-signature'
}

const cards = computed(() =>
  ATTRIBUTE_ENTITY_TYPES.map(entity => ({
    entity,
    icon: ENTITY_ICONS[entity],
    label: t(`forms.attributeDefinition.entityTypes.${entity}`),
    propertiesTo: `/settings/data-model/objects/${entity}/properties`,
    layoutTo: `/settings/data-model/objects/${entity}/layout`
  }))
)
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.objects')"
      :subtitle="t('settings.dataModel.objectsSubtitle')"
    />

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="card in cards"
        :key="card.entity"
        class="rounded-lg border border-default p-4"
      >
        <div class="flex items-center gap-3">
          <UIcon
            :name="card.icon"
            class="size-5 text-primary"
          />
          <h2 class="text-base font-semibold text-highlighted">
            {{ card.label }}
          </h2>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UButton
            :to="card.propertiesTo"
            :label="t('settings.dataModel.openProperties')"
            icon="i-lucide-list"
            color="neutral"
            variant="outline"
            size="sm"
          />
          <UButton
            :to="card.layoutTo"
            :label="t('settings.dataModel.openLayout')"
            icon="i-lucide-layout-dashboard"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>
      </div>
    </div>
  </div>
</template>
