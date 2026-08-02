<script setup lang="ts">
import type { ApiAccessGrant } from '~/types/access'
import type { ApiContractAccessSuspension } from '~/types/contract'

defineProps<{
  contractId: number
  suspension: ApiContractAccessSuspension | null | undefined
  grants: Array<ApiAccessGrant>
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const { t } = useI18n()
const toast = useToast()
const { post } = useApi()

const retryingId = ref<number | null>(null)

function stateColor(state: string) {
  if (state === 'applied') {
    return 'success' as const
  }
  if (state === 'applying' || state === 'revoking') {
    return 'warning' as const
  }
  if (state === 'failed') {
    return 'error' as const
  }
  return 'neutral' as const
}

async function retryGrant(grant: ApiAccessGrant) {
  retryingId.value = grant.id
  try {
    await post(`/api/access/grants/${grant.id}/retry`, {})
    toast.add({ title: t('access.grants.retryQueued'), color: 'success' })
    emit('refreshed')
  } catch {
    toast.add({ title: t('access.grants.retryError'), color: 'error' })
  } finally {
    retryingId.value = null
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-sm font-medium text-dimmed">
        {{ t('access.contractCard.title') }}
      </h2>
    </template>

    <div
      v-if="suspension?.active"
      class="mb-4 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm"
    >
      <p class="font-medium text-error">
        {{ t('access.contractCard.suspendedBanner') }}
      </p>
      <p class="mt-1 text-xs text-dimmed">
        {{ t(`access.suspension.reasons.${suspension.reason}`, suspension.reason ?? '') }}
        <span v-if="suspension.created_by?.name">
          · {{ suspension.created_by.name }}
        </span>
        <span v-if="suspension.pending_restore">
          · {{ t('access.contractCard.pendingRestore') }}
        </span>
      </p>
    </div>

    <div
      v-if="grants.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('access.contractCard.emptyGrants') }}
    </div>

    <ul
      v-else
      class="space-y-3"
    >
      <li
        v-for="grant in grants"
        :key="grant.id"
        class="flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ grant.label || `#${grant.point_id}` }}
          </p>
          <p
            v-if="grant.last_error"
            class="mt-0.5 text-xs text-error"
          >
            {{ grant.last_error }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="stateColor(String(grant.state))"
            variant="subtle"
            :label="t(`access.grants.states.${grant.state}`, grant.state)"
          />
          <UButton
            v-if="grant.can_retry"
            size="xs"
            color="neutral"
            variant="outline"
            :label="t('access.grants.retry')"
            :loading="retryingId === grant.id"
            @click="retryGrant(grant)"
          />
        </div>
      </li>
    </ul>
  </UCard>
</template>
