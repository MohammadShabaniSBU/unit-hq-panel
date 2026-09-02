<script setup lang="ts">
import type {
  AgentChannel,
  ConversationState,
  DemoChatMessage,
  VerificationLevel
} from '~/types/agents'

const props = defineProps<{
  messages: Array<DemoChatMessage>
  channel: AgentChannel
  state: ConversationState
  verificationLevel?: VerificationLevel | string | null
  handoff: {
    reason: string
    trigger_source: string
  } | null
  composer: string
  composerDisabled: boolean
  sending: boolean
}>()

const emit = defineEmits<{
  'update:composer': [value: string]
  'send': []
  'cancel': []
}>()

const scroller = ref<HTMLElement | null>(null)

watch(
  () => props.messages.map(message => `${message.id}:${message.content.length}:${message.consultingToolKey}`),
  async () => {
    await nextTick()
    if (scroller.value) {
      scroller.value.scrollTop = scroller.value.scrollHeight
    }
  }
)

const showHandoff = computed(() => {
  return props.handoff !== null || props.state !== 'active'
})
</script>

<template>
  <section class="flex min-w-0 flex-1 flex-col overflow-hidden bg-elevated/30">
    <div class="flex shrink-0 items-center justify-between border-b border-default bg-default px-4 py-3">
      <h2 class="text-sm font-medium text-highlighted">
        {{ $t('demo.chat.conversationTitle') }}
      </h2>
      <div class="flex items-center gap-1.5">
        <UBadge
          color="neutral"
          variant="subtle"
          size="xs"
          :label="$t(`demo.chat.channels.${channel}`)"
        />
        <AgentsAgentVerificationBadge :level="verificationLevel" />
      </div>
    </div>
    <div
      v-if="showHandoff && handoff"
      class="shrink-0 border-b border-default px-4 py-2"
    >
      <DemoChatHandoffBanner
        :reason="handoff.reason"
        :trigger-source="handoff.trigger_source"
      />
    </div>
    <div
      ref="scroller"
      class="min-h-0 flex-1 overflow-y-auto p-4"
    >
      <p
        v-if="messages.length === 0"
        class="py-12 text-center text-sm text-dimmed"
      >
        {{ $t('demo.chat.emptyBody') }}
      </p>
      <DemoEmailSkin
        v-else-if="channel === 'email'"
        :messages="messages"
      />
      <DemoSmsSkin
        v-else-if="channel === 'sms'"
        :messages="messages"
      />
      <DemoWhatsappSkin
        v-else-if="channel === 'whatsapp'"
        :messages="messages"
      />
      <DemoWebchatSkin
        v-else
        :messages="messages"
      />
    </div>
    <DemoChatComposer
      :model-value="composer"
      :channel="channel"
      :disabled="composerDisabled"
      :sending="sending"
      :state="state"
      @update:model-value="emit('update:composer', $event)"
      @send="emit('send')"
      @cancel="emit('cancel')"
    />
  </section>
</template>
