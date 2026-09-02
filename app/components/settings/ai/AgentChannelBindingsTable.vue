<script setup lang="ts">
import type { AgentChannel, AgentChannelBinding } from '~/types/agents'
import { AGENT_CHANNELS } from '~/types/agents'

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const { bindings, pending, error, refresh } = useAgentBindingList()

const boundChannels = computed(() => {
  const channels = new Set<AgentChannel>()
  for (const row of bindings.value) {
    channels.add(row.channel)
  }
  return channels
})

const unboundChannels = computed(() => {
  return AGENT_CHANNELS.filter(channel => !boundChannels.value.has(channel))
})

function siteLabel(row: AgentChannelBinding): string {
  return row.site?.name ?? t('ai.bindings.allSites')
}

function updatedByLabel(row: AgentChannelBinding): string {
  return row.updated_by?.name ?? t('ai.bindings.updatedByUnknown')
}

function toolLabel(key: string): string {
  const path = `ai.tools.${key}`
  const label = t(path)
  return label === path ? key : label
}

function channelOffCopy(channel: AgentChannel): string {
  if (channel === 'voice') {
    return t('ai.bindings.channelOffVoice')
  }
  return t('ai.bindings.channelOff', { channel: t(`demo.chat.channels.${channel}`) })
}
</script>

<template>
  <SettingsLoadError
    v-if="error"
    :message="t('ai.bindings.loadError')"
    @retry="refresh()"
  />

  <div
    v-else-if="pending"
    class="flex items-center justify-center py-12"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-6 animate-spin text-dimmed"
    />
  </div>

  <div
    v-else
    class="space-y-6"
  >
    <p
      v-if="bindings.length === 0"
      class="rounded-lg border border-default bg-elevated/40 px-4 py-3 text-sm text-toned"
    >
      {{ t('ai.bindings.empty') }}
    </p>

    <div
      v-else
      class="overflow-x-auto rounded-lg border border-default"
    >
      <table class="w-full min-w-[960px] text-left text-sm">
        <thead class="border-b border-default bg-elevated/40 text-xs font-medium uppercase tracking-wide text-dimmed">
          <tr>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.agent') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.channel') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.site') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.mode') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.audience') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.outsideHours') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.allowedTools') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.updatedBy') }}
            </th>
            <th class="px-4 py-2">
              {{ t('ai.bindings.columns.updatedAt') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in bindings"
            :key="row.id"
            class="border-b border-default last:border-b-0"
          >
            <td class="px-4 py-3 align-top font-medium text-highlighted">
              {{ row.agent.name }}
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ t(`demo.chat.channels.${row.channel}`) }}
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ siteLabel(row) }}
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ t(`ai.bindings.modes.${row.mode}`) }}
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ t(`ai.bindings.audiences.${row.audience}`) }}
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ t(`ai.bindings.outsideHours.${row.outside_hours}`) }}
            </td>
            <td class="px-4 py-3 align-top">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="tool in row.allowed_tools"
                  :key="tool"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  :label="toolLabel(tool)"
                />
              </div>
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ updatedByLabel(row) }}
            </td>
            <td class="px-4 py-3 align-top text-toned">
              {{ formatDateTime(row.updated_at, { empty: t('common.emptyValue') }) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul
      v-if="unboundChannels.length > 0"
      class="space-y-2"
    >
      <li
        v-for="channel in unboundChannels"
        :key="channel"
        class="rounded-lg border border-dashed border-default px-4 py-3 text-sm text-toned"
      >
        {{ channelOffCopy(channel) }}
      </li>
    </ul>
  </div>
</template>
