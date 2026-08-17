<script setup lang="ts">
import type { AgentChannel, ConversationState } from '~/types/agents'
import { SMS_MAX_CHARACTERS } from '~/types/agents'
import { countSmsSegments } from '~/utils/smsSegments'

const props = defineProps<{
  modelValue: string
  channel: AgentChannel
  disabled: boolean
  sending: boolean
  state: ConversationState
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
  'cancel': []
}>()

const { t } = useI18n()

const smsCount = computed(() => countSmsSegments(props.modelValue))

const overCap = computed(() => {
  return props.channel === 'sms' && smsCount.value.length > SMS_MAX_CHARACTERS
})

const disabledReason = computed(() => {
  if (props.state === 'handed_off') {
    return t('demo.chat.composerDisabledHandoff')
  }
  if (props.state === 'closed') {
    return t('demo.chat.composerDisabledClosed')
  }
  if (props.state === 'awaiting_human') {
    return t('demo.chat.composerDisabledAwaiting')
  }
  return null
})

function onSubmit() {
  if (props.disabled || overCap.value || props.modelValue.trim() === '') {
    return
  }
  emit('send')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSubmit()
  }
}
</script>

<template>
  <div class="shrink-0 border-t border-default p-3">
    <p
      v-if="disabledReason"
      class="mb-2 text-xs text-dimmed"
    >
      {{ disabledReason }}
    </p>
    <div class="flex items-end gap-2">
      <UTextarea
        :model-value="modelValue"
        :placeholder="$t('demo.chat.composerPlaceholder')"
        :disabled="disabled"
        :rows="3"
        autoresize
        class="flex-1"
        @update:model-value="emit('update:modelValue', String($event ?? ''))"
        @keydown="onKeydown"
      />
      <UButton
        v-if="sending"
        color="neutral"
        variant="soft"
        @click="emit('cancel')"
      >
        {{ $t('demo.chat.cancelSend') }}
      </UButton>
      <UButton
        v-else
        :disabled="disabled || overCap || modelValue.trim() === ''"
        @click="onSubmit"
      >
        {{ $t('demo.chat.send') }}
      </UButton>
    </div>
    <div
      v-if="channel === 'sms'"
      class="mt-1.5 flex items-center justify-between text-[11px]"
      :class="overCap ? 'text-error' : 'text-dimmed'"
    >
      <span>
        {{ $t('demo.chat.segments', {
          count: smsCount.segments,
          encoding: smsCount.encoding
        }) }}
      </span>
      <span>
        {{ $t('demo.chat.smsCap', { length: smsCount.length, max: SMS_MAX_CHARACTERS }) }}
      </span>
    </div>
    <p
      v-if="overCap"
      class="mt-1 text-[11px] text-error"
    >
      {{ $t('demo.chat.smsOverCap') }}
    </p>
  </div>
</template>
