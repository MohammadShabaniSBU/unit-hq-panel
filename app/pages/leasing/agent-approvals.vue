<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.AgentActionApprove)) {
  await navigateTo('/leasing/contacts')
}

const { t } = useI18n()

const {
  actions,
  pending,
  error,
  refresh,
  page,
  perPage,
  totalCount,
  lastPage,
  showingCount,
  canGoPrev,
  canGoNext,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useAgentPendingActionList()

function onResolved(action: { status: string }) {
  if (action.status !== 'approved') {
    void refresh()
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold text-highlighted">
        {{ t('pages.agentApprovals.title') }}
      </h1>
      <p class="text-sm text-dimmed">
        {{ t('pages.agentApprovals.subtitle') }}
      </p>
    </div>

    <div
      v-if="pending && actions.length === 0"
      class="mt-8 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ t('pages.agentApprovals.loadError') }}
      </p>
      <UButton
        :label="t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <p
      v-else-if="actions.length === 0"
      class="mt-8 text-sm text-dimmed"
    >
      {{ t('pages.agentApprovals.empty') }}
    </p>

    <div
      v-else
      class="mt-6 space-y-4"
    >
      <LeasingAgentPendingActionCard
        v-for="action in actions"
        :key="action.id"
        :action="action"
        :can-act="true"
        @approved="onResolved"
        @rejected="onResolved"
      />

      <FacilityListPagination
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </div>
  </UContainer>
</template>
