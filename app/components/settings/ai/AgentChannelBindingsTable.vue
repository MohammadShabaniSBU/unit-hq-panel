<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { AgentChannel, AgentChannelBinding } from '~/types/agents'
import { AGENT_CHANNELS } from '~/types/agents'

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const { bindings, pending, error, refresh } = useAgentBindingList()

const AllowedToolsCell = resolveComponent('SettingsAiAgentChannelAllowedToolsCell')

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

function channelOffCopy(channel: AgentChannel): string {
  if (channel === 'voice') {
    return t('ai.bindings.channelOffVoice')
  }
  return t('ai.bindings.channelOff', { channel: t(`demo.chat.channels.${channel}`) })
}

const columns = computed<Array<TableColumn<AgentChannelBinding>>>(() => [
  {
    accessorKey: 'agent',
    header: t('ai.bindings.columns.agent'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.agent.name)
  },
  {
    accessorKey: 'channel',
    header: t('ai.bindings.columns.channel'),
    cell: ({ row }) => t(`demo.chat.channels.${row.original.channel}`)
  },
  {
    accessorKey: 'site',
    header: t('ai.bindings.columns.site'),
    cell: ({ row }) => siteLabel(row.original)
  },
  {
    accessorKey: 'mode',
    header: t('ai.bindings.columns.mode'),
    cell: ({ row }) => t(`ai.bindings.modes.${row.original.mode}`)
  },
  {
    accessorKey: 'audience',
    header: t('ai.bindings.columns.audience'),
    cell: ({ row }) => t(`ai.bindings.audiences.${row.original.audience}`)
  },
  {
    accessorKey: 'outside_hours',
    header: t('ai.bindings.columns.outsideHours'),
    cell: ({ row }) => t(`ai.bindings.outsideHours.${row.original.outside_hours}`)
  },
  {
    id: 'allowedTools',
    header: t('ai.bindings.columns.allowedTools'),
    cell: ({ row }) => h(AllowedToolsCell, { tools: row.original.allowed_tools })
  },
  {
    id: 'updatedBy',
    header: t('ai.bindings.columns.updatedBy'),
    cell: ({ row }) => updatedByLabel(row.original)
  },
  {
    accessorKey: 'updated_at',
    header: t('ai.bindings.columns.updatedAt'),
    cell: ({ row }) => formatDateTime(row.original.updated_at, { empty: t('common.emptyValue') })
  }
])
</script>

<template>
  <SettingsLoadError
    v-if="error"
    :message="t('ai.bindings.loadError')"
    @retry="refresh()"
  />

  <div
    v-else-if="pending && bindings.length === 0"
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
      style="max-height: calc(100vh - 320px)"
    >
      <UTable
        :data="bindings"
        :columns="columns"
        :loading="pending"
      />
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
