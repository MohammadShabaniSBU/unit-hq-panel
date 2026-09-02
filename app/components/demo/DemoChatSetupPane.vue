<script setup lang="ts">
import type { AiAgent, AiDemoPersona, AgentChannel, AgentReplyLocale, VerificationLevel } from '~/types/agents'
import { AGENT_CHANNELS, AGENT_REPLY_LOCALES, VERIFICATION_LEVELS } from '~/types/agents'
import type { ApiOption } from '~/types/facility'

const props = defineProps<{
  agents: Array<AiAgent>
  personas: Array<AiDemoPersona>
  sites: Array<ApiOption>
  agentKey: string | null
  channel: AgentChannel
  personaId: number | null
  verificationLevel: VerificationLevel
  siteId: number | null
  replyLocale: AgentReplyLocale
}>()

const emit = defineEmits<{
  'update:agentKey': [value: string | null]
  'update:channel': [value: AgentChannel]
  'update:personaId': [value: number | null, siteId?: number | null]
  'update:verificationLevel': [value: VerificationLevel]
  'update:siteId': [value: number | null]
  'update:replyLocale': [value: AgentReplyLocale]
  'reset': []
  'newConvo': []
}>()

const { t } = useI18n()

const agentItems = computed(() => props.agents.map(agent => ({
  label: agent.name,
  value: agent.key
})))

const DEMO_CHANNELS: Array<AgentChannel> = ['email', 'sms', 'whatsapp', 'webchat']

const channelItems = computed(() => DEMO_CHANNELS.map(value => ({
  label: t(`demo.chat.channels.${value}`),
  value
})))

const personaItems = computed(() => [
  { label: t('demo.chat.personaNone'), value: null as number | null },
  ...props.personas.map((persona) => {
    const flags: Array<string> = []
    if (persona.has_contract) {
      flags.push(t('demo.chat.personaHasContract'))
    }
    if (persona.has_balance) {
      flags.push(t('demo.chat.personaHasBalance'))
    }
    if (persona.has_delinquency) {
      flags.push(t('demo.chat.personaHasDelinquency'))
    }
    const site = persona.site?.name ? ` · ${persona.site.name}` : ''
    const flagLabel = flags.length ? ` (${flags.join(', ')})` : ''
    return {
      label: `${persona.name}${site}${flagLabel}`,
      value: persona.id as number | null
    }
  })
])

const verificationItems = computed(() => VERIFICATION_LEVELS.map(value => ({
  label: t(`demo.chat.verificationLevels.${value}`),
  value,
  disabled: value === 'verified' && props.personaId === null
})))

const siteItems = computed(() => [
  { label: t('demo.chat.siteNone'), value: null as number | null },
  ...props.sites.map(site => ({
    label: site.label,
    value: site.value as number | null
  }))
])

const localeItems = computed(() => AGENT_REPLY_LOCALES.map(value => ({
  label: t(`demo.chat.locales.${value}`),
  value
})))

const personaDisabled = computed(() => props.verificationLevel === 'anonymous')

function onAgentChange(value: unknown) {
  emit('update:agentKey', typeof value === 'string' ? value : null)
}

function onChannelChange(value: unknown) {
  if (value === 'email' || value === 'sms' || value === 'whatsapp' || value === 'webchat') {
    emit('update:channel', value)
  }
}

function onPersonaChange(value: unknown) {
  const id = typeof value === 'number' ? value : null
  const persona = props.personas.find(item => item.id === id) ?? null
  emit('update:personaId', id, persona?.site_id ?? undefined)
}

function onVerificationChange(value: unknown) {
  if (value === 'anonymous' || value === 'channel_asserted' || value === 'verified') {
    emit('update:verificationLevel', value)
  }
}

function onSiteChange(value: unknown) {
  emit('update:siteId', typeof value === 'number' ? value : null)
}

function onLocaleChange(value: unknown) {
  if (value === 'en' || value === 'es' || value === 'fr') {
    emit('update:replyLocale', value)
  }
}
</script>

<template>
  <aside class="flex h-full w-72 shrink-0 flex-col border-r border-default bg-default">
    <div class="shrink-0 border-b border-default px-4 py-3">
      <h2 class="text-sm font-medium text-highlighted">
        {{ $t('demo.chat.setupTitle') }}
      </h2>
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <UFormField :label="$t('demo.chat.agent')">
        <USelect
          :model-value="agentKey ?? undefined"
          :items="agentItems"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onAgentChange"
        />
      </UFormField>
      <UFormField :label="$t('demo.chat.channel')">
        <USelect
          :model-value="channel"
          :items="channelItems"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onChannelChange"
        />
      </UFormField>
      <UFormField :label="$t('demo.chat.persona')">
        <USelect
          :model-value="personaId ?? undefined"
          :items="personaItems"
          :disabled="personaDisabled"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onPersonaChange"
        />
      </UFormField>
      <UFormField :label="$t('demo.chat.verification')">
        <USelect
          :model-value="verificationLevel"
          :items="verificationItems"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onVerificationChange"
        />
        <p class="mt-1 text-xs text-dimmed">
          {{ $t('demo.chat.verificationDemoHelp') }}
        </p>
      </UFormField>
      <UFormField :label="$t('demo.chat.site')">
        <USelect
          :model-value="siteId ?? undefined"
          :items="siteItems"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onSiteChange"
        />
      </UFormField>
      <UFormField :label="$t('demo.chat.locale')">
        <USelect
          :model-value="replyLocale"
          :items="localeItems"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onLocaleChange"
        />
      </UFormField>
    </div>
    <div class="flex shrink-0 flex-col gap-2 border-t border-default p-4">
      <UButton
        color="neutral"
        variant="soft"
        block
        @click="emit('newConvo')"
      >
        {{ $t('demo.chat.newConvo') }}
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        block
        @click="emit('reset')"
      >
        {{ $t('demo.chat.reset') }}
      </UButton>
    </div>
  </aside>
</template>
