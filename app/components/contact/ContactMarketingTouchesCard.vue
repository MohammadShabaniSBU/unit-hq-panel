<script setup lang="ts">
import type { MarketingTouchRow } from '~/types/advertising'

const props = defineProps<{
  contactId: number
}>()

const { t } = useI18n()
const { get } = useApi()
const { formatDateTime } = useOrgDateFormat()

const touches = ref<Array<MarketingTouchRow>>([])
const pending = ref(false)
const failed = ref(false)

function platformMark(platform: string | null) {
  if (platform === 'google_ads') {
    return 'G'
  }
  if (platform === 'meta') {
    return 'M'
  }
  return '·'
}

onMounted(async () => {
  pending.value = true
  try {
    const response = await get<Array<MarketingTouchRow>>(`/api/contacts/${props.contactId}/marketing-touches`)
    touches.value = response.data
  } catch {
    failed.value = true
  } finally {
    pending.value = false
  }
})
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-sm font-medium text-dimmed">
        {{ t('pages.contacts.marketingTouches.title') }}
      </h2>
    </template>
    <p
      v-if="pending"
      class="text-sm text-dimmed"
    >
      {{ t('pages.contacts.marketingTouches.loading') }}
    </p>
    <p
      v-else-if="failed"
      class="text-sm text-error"
    >
      {{ t('pages.contacts.marketingTouches.loadError') }}
    </p>
    <p
      v-else-if="touches.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.contacts.marketingTouches.empty') }}
    </p>
    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="(touch, index) in touches"
        :key="`${touch.occurred_at}-${index}`"
        class="flex items-start gap-3 text-sm"
      >
        <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-elevated text-xs font-semibold text-highlighted">
          {{ platformMark(touch.platform) }}
        </span>
        <div class="min-w-0">
          <p class="text-highlighted">
            {{ formatDateTime(touch.occurred_at) }}
          </p>
          <p class="text-dimmed">
            {{ touch.utm_campaign || t('common.emptyValue') }}
            · {{ touch.landing_path || t('common.emptyValue') }}
          </p>
        </div>
      </li>
    </ul>
  </UCard>
</template>
