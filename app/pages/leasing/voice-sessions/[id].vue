<script setup lang="ts">
import type { AgentConversationMessage, AgentTraceEntry } from '~/types/agents'
import { mapTraceRows } from '~/utils/agentTrace'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.AiAgentUse)) {
  await navigateTo('/leasing/contacts')
}

const route = useRoute()
const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()

const sessionId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
})

const { session, pending, error, refresh } = useVoiceSession(sessionId)

function contactLabel(): string {
  const contact = session.value?.contact
  if (!contact) {
    return t('pages.voiceSessions.noContact')
  }
  return [contact.first_name, contact.last_name].filter(Boolean).join(' ')
}

function formatSpan(seconds: number | null | undefined): string {
  if (seconds == null) {
    return t('common.emptyValue')
  }
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) {
    return t('pages.voiceSessions.spanSeconds', { seconds: rest })
  }
  return t('pages.voiceSessions.spanMinutes', { minutes, seconds: rest })
}

const transcriptMessages = computed(() => {
  const messages = session.value?.conversation?.messages ?? []
  return messages.filter((message: AgentConversationMessage) => message.blocked_by == null
    && (message.role === 'user' || message.role === 'assistant'))
})

const traceEntries = computed<Array<AgentTraceEntry>>(() => {
  return mapTraceRows(session.value?.conversation?.trace ?? [])
})
</script>

<template>
  <div class="flex h-[calc(100svh-4rem)] flex-col">
    <div class="shrink-0 border-b border-default bg-default px-4 py-3 sm:px-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <UButton
            to="/leasing/voice-sessions"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-arrow-left"
            :label="$t('pages.voiceSessions.backToList')"
          />
          <h1 class="text-lg font-semibold text-highlighted">
            {{ $t('pages.voiceSessions.detailTitle') }}
          </h1>
          <p
            v-if="session"
            class="text-sm text-toned"
          >
            {{ formatDateTime(session.started_at, { empty: t('common.emptyValue') }) }}
            · {{ session.caller_number ?? $t('pages.voiceSessions.callerWithheld') }}
            · {{ session.site?.name ?? $t('common.emptyValue') }}
          </p>
        </div>
        <div
          v-if="session"
          class="flex flex-wrap items-center gap-2"
        >
          <AgentsAgentVerificationBadge :level="session.verification_level" />
          <UBadge
            :color="session.transfer_requested ? 'warning' : 'neutral'"
            variant="subtle"
            size="xs"
            :label="session.transfer_requested
              ? $t('pages.voiceSessions.transferYes')
              : $t('pages.voiceSessions.transferNo')"
          />
        </div>
      </div>
      <p
        v-if="session"
        class="mt-2 text-xs text-dimmed"
      >
        {{ $t('pages.voiceSessions.voiceCeiling') }}
      </p>
    </div>

    <div
      v-if="pending && !session"
      class="flex flex-1 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <UAlert
      v-else-if="error"
      class="m-6"
      color="error"
      variant="subtle"
      :title="$t('pages.voiceSessions.detailLoadError')"
      :actions="[{
        label: $t('common.retry'),
        color: 'neutral',
        variant: 'outline',
        onClick: () => refresh()
      }]"
    />

    <div
      v-else-if="session"
      class="flex min-h-0 flex-1 flex-col lg:flex-row"
    >
      <section class="flex min-w-0 flex-1 flex-col overflow-hidden border-b border-default lg:border-b-0 lg:border-r">
        <div class="shrink-0 space-y-2 border-b border-default px-4 py-3">
          <h2 class="text-sm font-medium text-highlighted">
            {{ $t('pages.voiceSessions.transcriptTitle') }}
          </h2>
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-toned">
            <dt>{{ $t('pages.voiceSessions.columns.contact') }}</dt>
            <dd>
              <NuxtLink
                v-if="session.contact"
                :to="`/leasing/contacts/${session.contact.id}`"
                class="text-highlighted hover:underline"
              >
                {{ contactLabel() }}
              </NuxtLink>
              <span v-else>{{ $t('pages.voiceSessions.noContact') }}</span>
            </dd>
            <dt>{{ $t('pages.voiceSessions.columns.delegatedSpan') }}</dt>
            <dd>{{ formatSpan(session.delegated_span_seconds) }}</dd>
          </dl>
          <p class="text-xs text-dimmed">
            {{ $t('pages.voiceSessions.returnedDisclaimer') }}
          </p>
          <p class="text-xs text-dimmed">
            {{ $t('pages.voiceSessions.blockedInTrace') }}
          </p>
          <p class="text-xs text-dimmed">
            {{ $t('pages.voiceSessions.dispositionUnknown') }}
          </p>
        </div>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <p
            v-if="transcriptMessages.length === 0"
            class="py-12 text-center text-sm text-dimmed"
          >
            {{ $t('pages.voiceSessions.transcriptEmpty') }}
          </p>
          <article
            v-for="message in transcriptMessages"
            :key="message.id"
            class="rounded-lg border border-default px-3 py-2"
            :class="message.role === 'user' ? 'bg-elevated/40' : 'bg-default'"
          >
            <p class="text-[11px] font-medium uppercase tracking-wide text-dimmed">
              {{ message.role === 'user'
                ? $t('pages.voiceSessions.callerAsked')
                : $t('pages.voiceSessions.agentReturned') }}
            </p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-highlighted">
              {{ message.content || t('common.emptyValue') }}
            </p>
          </article>
        </div>
      </section>

      <aside class="flex h-80 shrink-0 flex-col overflow-hidden lg:h-auto lg:w-96">
        <div class="shrink-0 border-b border-default px-4 py-3">
          <h2 class="text-sm font-medium text-highlighted">
            {{ $t('pages.voiceSessions.traceTitle') }}
          </h2>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <AgentsAgentTraceTurnList :entries="traceEntries" />
        </div>
      </aside>
    </div>
  </div>
</template>
