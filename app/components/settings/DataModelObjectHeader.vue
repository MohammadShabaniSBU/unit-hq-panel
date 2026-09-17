<script setup lang="ts">
import type { AttributeEntityType } from '~/types/attribute'

const props = defineProps<{
  entity: AttributeEntityType
  tab: 'properties' | 'layout'
}>()

const router = useRouter()
const { t } = useI18n()

const tabItems = computed(() => [
  {
    label: t('settings.tabs.properties'),
    value: 'properties',
    icon: 'i-lucide-list'
  },
  {
    label: t('settings.tabs.layout'),
    value: 'layout',
    icon: 'i-lucide-layout-dashboard'
  }
])

function onTabChange(value: string | number) {
  const tab = String(value)
  if (tab === props.tab) {
    return
  }

  void router.push(`/settings/data-model/objects/${props.entity}/${tab}`)
}
</script>

<template>
  <div class="mb-6">
    <UButton
      to="/settings/data-model/objects"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      size="sm"
      :label="t('settings.dataModel.backToObjects')"
      class="mb-3"
    />

    <SettingsSectionHeader
      :title="t(`forms.attributeDefinition.entityTypes.${entity}`)"
      :subtitle="t('settings.dataModel.objectsSubtitle')"
    />

    <UTabs
      :model-value="tab"
      :items="tabItems"
      class="mt-4"
      :content="false"
      @update:model-value="onTabChange"
    />
  </div>
</template>
