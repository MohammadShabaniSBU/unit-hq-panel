<script setup lang="ts">
import type { Campaign } from '~/types/campaign'

const route = useRoute()
const api = useCampaignApi()
const id = computed(() => Number(route.params.id))
const campaign = ref<Campaign | null>(null)
const pending = ref(true)
const error = ref(false)

watch(id, () => {
  void load()
}, { immediate: true })

async function load() {
  if (!Number.isInteger(id.value) || id.value <= 0) {
    error.value = true
    pending.value = false
    return
  }
  pending.value = true
  error.value = false
  try {
    campaign.value = await api.load(id.value)
  } catch {
    error.value = true
    campaign.value = null
  } finally {
    pending.value = false
  }
}

function onChanged(next: Campaign) {
  campaign.value = next
}
</script>

<template>
  <div
    v-if="pending"
    class="flex h-48 items-center justify-center"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-6 animate-spin text-dimmed"
    />
  </div>
  <div
    v-else-if="error || !campaign"
    class="flex h-48 flex-col items-center justify-center gap-3"
  >
    <p class="text-sm text-dimmed">
      {{ $t('pages.campaigns.loadError') }}
    </p>
    <UButton
      :label="$t('common.retry')"
      variant="outline"
      color="neutral"
      @click="load"
    />
  </div>
  <MarketingCampaignWizard
    v-else-if="campaign.status === 'draft'"
    :type="campaign.type"
    :campaign="campaign"
    @changed="onChanged"
  />
  <MarketingCampaignDetail
    v-else
    :campaign="campaign"
    @changed="onChanged"
  />
</template>
