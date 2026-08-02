<script setup lang="ts">
import type { ApiActiveCall } from '~/types/communications'

const { t } = useI18n()
const { badge } = useInboxBadge()

const activeCalls = computed(() => badge.value.active_calls ?? [])

function titleFor(call: ApiActiveCall): string {
  if (call.contact) {
    return call.phase === 'ringing'
      ? t('calls.ringingWith', { name: call.contact.name })
      : t('calls.onCallWith', { name: call.contact.name })
  }

  if (call.phase === 'ringing') {
    return t('calls.unknownCaller', { number: call.number })
  }

  return t('calls.onCallUnknown')
}

function openThread(threadId: number) {
  void navigateTo(`/inbox?thread=${threadId}`)
}

function resolveTriage(triageId: number) {
  void navigateTo(`/inbox?mode=triage&triage=${triageId}`)
}
</script>

<template>
  <div
    v-if="activeCalls.length > 0"
    class="border-b border-primary/20 bg-primary/10"
  >
    <div
      v-for="(call, index) in activeCalls"
      :key="call.message_id ?? call.triage_id ?? `${call.number}-${index}`"
      class="flex flex-wrap items-center gap-2 px-4 py-2 text-sm"
      :class="index > 0 ? 'border-t border-primary/10' : ''"
    >
      <UIcon
        :name="call.phase === 'ringing' ? 'i-lucide-phone-incoming' : 'i-lucide-phone-call'"
        class="size-4 shrink-0 text-primary"
      />
      <span class="min-w-0 font-medium text-highlighted">
        {{ titleFor(call) }}
      </span>
      <span
        v-if="call.contact && call.number"
        class="text-xs text-dimmed"
      >
        {{ call.number }}
      </span>
      <UBadge
        v-for="chip in call.context_chips"
        :key="`${chip.type}-${chip.delinquency_id ?? 0}`"
        :label="chip.type === 'overdue' ? t('calls.overdue') : chip.type"
        color="error"
        variant="subtle"
        size="xs"
      />
      <div class="ms-auto flex flex-wrap items-center gap-1.5">
        <UButton
          v-if="call.thread_id"
          :label="t('calls.openThread')"
          size="xs"
          color="primary"
          variant="soft"
          @click="openThread(call.thread_id)"
        />
        <UButton
          v-else-if="call.triage_id"
          :label="t('calls.resolve')"
          size="xs"
          color="primary"
          variant="soft"
          @click="resolveTriage(call.triage_id)"
        />
      </div>
    </div>
  </div>
</template>
