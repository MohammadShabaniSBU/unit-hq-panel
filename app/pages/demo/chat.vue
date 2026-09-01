<script setup lang="ts">
import type { AiAgent } from '~/types/agents'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.AiAgentUse)) {
  await navigateTo('/leasing/contacts')
}

const { t } = useI18n()
const { demoOff, pending: flagPending } = useAgentsDemoAvailable()
const { agents, pending: agentsPending } = useAgentList()
const personasEnabled = computed(() => !flagPending.value && !demoOff.value)
const { personas } = useDemoPersonaList(personasEnabled)
const { items: sites } = useOptions('/api/sites/options')

const {
  agentKey,
  channel,
  personaId,
  verificationLevel,
  siteId,
  replyLocale,
  conversation,
  messages,
  trace,
  state,
  lastHandoff,
  sending,
  streaming,
  composer,
  confirmOpen,
  composerDisabled,
  totals,
  setAgentKey,
  setChannel,
  setPersonaId,
  setVerificationLevel,
  setSiteId,
  setReplyLocale,
  confirmSetupChange,
  cancelSetupChange,
  reset,
  newConversation,
  send,
  cancelSend
} = useAgentChat()

watch(agents, (list: Array<AiAgent>) => {
  if (agentKey.value === null && list[0]) {
    agentKey.value = list[0].key
  }
}, { immediate: true })

const loading = computed(() => flagPending.value || agentsPending.value)

function onReset() {
  void reset({ agentKey: agents.value[0]?.key ?? agentKey.value })
}
</script>

<template>
  <div>
    <div
      v-if="demoOff"
      class="flex h-[calc(100svh-4rem)] items-center justify-center p-8"
    >
      <div class="max-w-md text-center">
        <h1 class="text-lg font-medium text-highlighted">
          {{ $t('demo.chat.demoDisabledTitle') }}
        </h1>
        <p class="mt-2 text-sm text-dimmed">
          {{ $t('demo.chat.demoDisabledBody') }}
        </p>
      </div>
    </div>
    <div
      v-else-if="loading"
      class="flex h-[calc(100svh-4rem)] items-center justify-center text-sm text-dimmed"
    >
      {{ $t('common.loading') }}
    </div>
    <DemoChatLayout v-else>
      <template #setup>
        <DemoChatSetupPane
          :agents="agents"
          :personas="personas"
          :sites="sites"
          :agent-key="agentKey"
          :channel="channel"
          :persona-id="personaId"
          :verification-level="verificationLevel"
          :site-id="siteId"
          :reply-locale="replyLocale"
          @update:agent-key="setAgentKey"
          @update:channel="setChannel"
          @update:persona-id="setPersonaId"
          @update:verification-level="setVerificationLevel"
          @update:site-id="setSiteId"
          @update:reply-locale="setReplyLocale"
          @reset="onReset"
          @new-convo="newConversation"
        />
      </template>
      <template #conversation>
        <DemoChatConversationPane
          :messages="messages"
          :channel="channel"
          :state="state"
          :verification-level="conversation?.verification_level"
          :handoff="lastHandoff"
          :composer="composer"
          :composer-disabled="composerDisabled"
          :sending="sending || streaming"
          @update:composer="composer = $event"
          @send="send"
          @cancel="cancelSend"
        />
      </template>
      <template #trace>
        <DemoChatTracePane
          :entries="trace"
          :totals="totals"
          :reply-locale="replyLocale"
          :conversation-id="conversation?.id"
        />
      </template>
    </DemoChatLayout>

    <UModal v-model:open="confirmOpen">
      <template #content>
        <div class="space-y-4 p-6">
          <h3 class="font-medium text-highlighted">
            {{ t('demo.chat.confirmTitle') }}
          </h3>
          <p class="text-sm text-dimmed">
            {{ t('demo.chat.confirmBody') }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="cancelSetupChange"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton @click="confirmSetupChange">
              {{ t('demo.chat.confirmChange') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
