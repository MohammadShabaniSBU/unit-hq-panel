<script setup lang="ts">
import type { AgentWriteTool, AiAgent, VerificationLevel, WriteMode } from '~/types/agents'
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const toast = useToast()
const { can } = usePermissions()
const canEdit = computed(() => can(Permission.SettingsManage))

const {
  agents,
  pending,
  error,
  refresh,
  saveTool,
  isSaving,
  fieldErrors,
  saveError
} = useAgentWritePolicies()

function toolLabel(toolKey: string): string {
  const path = `ai.tools.${toolKey}`
  const label = t(path)
  return label === path ? toolKey : label
}

function verificationLabel(level: VerificationLevel): string {
  return t(`settings.agentWritePolicy.verification.${level}`)
}

function modeItems(tool: AgentWriteTool) {
  return [
    { label: t('settings.agentWritePolicy.modes.off'), value: 'off' as WriteMode },
    {
      label: t('settings.agentWritePolicy.modes.propose'),
      value: 'propose' as WriteMode,
      disabled: !tool.proposable
    },
    { label: t('settings.agentWritePolicy.modes.commit'), value: 'commit' as WriteMode }
  ]
}

function verificationItems(tool: AgentWriteTool) {
  const ranks: Record<VerificationLevel, number> = {
    anonymous: 0,
    channel_asserted: 1,
    verified: 2
  }
  const floor = ranks[tool.required_verification]
  const items: Array<{ label: string, value: string, disabled?: boolean }> = [
    {
      label: t('settings.agentWritePolicy.verification.toolDefault', {
        level: verificationLabel(tool.required_verification)
      }),
      value: '__default__'
    }
  ]
  for (const level of ['channel_asserted', 'verified'] as Array<VerificationLevel>) {
    if (ranks[level] > floor) {
      items.push({
        label: verificationLabel(level),
        value: level
      })
    }
  }
  return items
}

function verificationModel(tool: AgentWriteTool): string {
  return tool.min_verification ?? '__default__'
}

function onVerificationChange(tool: AgentWriteTool, value: string) {
  tool.min_verification = value === '__default__' ? null : value as VerificationLevel
}

function maxModel(value: number | null): string {
  return value == null ? '' : String(value)
}

function onMaxChange(
  tool: AgentWriteTool,
  field: 'max_per_conversation' | 'max_per_day',
  raw: string
) {
  const trimmed = raw.trim()
  if (trimmed === '') {
    tool[field] = null
    return
  }
  const parsed = Number.parseInt(trimmed, 10)
  tool[field] = Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function onSave(agent: AiAgent, tool: AgentWriteTool) {
  const ok = await saveTool(agent, tool)
  if (ok) {
    toast.add({ title: t('settings.agentWritePolicy.saveSuccess'), color: 'success' })
  }
}
</script>

<template>
  <SettingsLoadError
    v-if="error"
    :message="t('pages.settings.loadError')"
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
    class="space-y-8"
  >
    <p
      v-if="!canEdit"
      class="rounded-lg border border-default bg-elevated/40 px-4 py-3 text-sm text-toned"
    >
      {{ t('settings.agentWritePolicy.readOnly') }}
    </p>

    <p
      v-if="saveError"
      class="text-sm text-error"
    >
      {{ saveError }}
    </p>
    <p
      v-if="fieldErrors.mode?.[0] || fieldErrors.min_verification?.[0] || fieldErrors.tool_key?.[0]"
      class="text-sm text-error"
    >
      {{ fieldErrors.mode?.[0] || fieldErrors.min_verification?.[0] || fieldErrors.tool_key?.[0] }}
    </p>

    <section
      v-for="agent in agents"
      :key="agent.id"
      class="space-y-3"
    >
      <div>
        <h2 class="text-base font-medium text-highlighted">
          {{ agent.name }}
        </h2>
        <p class="text-xs text-dimmed">
          {{ agent.key }}
        </p>
      </div>

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="border-b border-default bg-elevated/40 text-xs font-medium uppercase tracking-wide text-dimmed">
            <tr>
              <th class="px-4 py-2">
                {{ t('settings.agentWritePolicy.columns.tool') }}
              </th>
              <th class="px-4 py-2">
                {{ t('settings.agentWritePolicy.columns.mode') }}
              </th>
              <th class="px-4 py-2">
                {{ t('settings.agentWritePolicy.columns.maxConversation') }}
              </th>
              <th class="px-4 py-2">
                {{ t('settings.agentWritePolicy.columns.maxDay') }}
              </th>
              <th class="px-4 py-2">
                {{ t('settings.agentWritePolicy.columns.minVerification') }}
              </th>
              <th
                v-if="canEdit"
                class="px-4 py-2"
              />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tool in (agent.write_tools ?? [])"
              :key="tool.key"
              class="border-b border-default last:border-b-0"
            >
              <td class="px-4 py-3 align-top font-medium text-highlighted">
                {{ toolLabel(tool.key) }}
              </td>
              <td class="px-4 py-3 align-top">
                <USelect
                  v-model="tool.mode"
                  :items="modeItems(tool)"
                  value-key="value"
                  label-key="label"
                  :disabled="!canEdit"
                  class="w-44"
                />
                <p
                  v-if="tool.mode === 'commit'"
                  class="mt-1 max-w-52 text-xs text-dimmed"
                >
                  {{ t('settings.agentWritePolicy.automaticHelp') }}
                </p>
              </td>
              <td class="px-4 py-3 align-top">
                <UInput
                  :model-value="maxModel(tool.max_per_conversation)"
                  type="number"
                  min="1"
                  :placeholder="t('settings.agentWritePolicy.unlimited')"
                  :disabled="!canEdit"
                  class="w-28"
                  @update:model-value="onMaxChange(tool, 'max_per_conversation', String($event ?? ''))"
                />
              </td>
              <td class="px-4 py-3 align-top">
                <UInput
                  :model-value="maxModel(tool.max_per_day)"
                  type="number"
                  min="1"
                  :placeholder="t('settings.agentWritePolicy.unlimited')"
                  :disabled="!canEdit"
                  class="w-28"
                  @update:model-value="onMaxChange(tool, 'max_per_day', String($event ?? ''))"
                />
              </td>
              <td class="px-4 py-3 align-top">
                <USelect
                  :model-value="verificationModel(tool)"
                  :items="verificationItems(tool)"
                  value-key="value"
                  label-key="label"
                  :disabled="!canEdit"
                  class="w-52"
                  @update:model-value="onVerificationChange(tool, String($event ?? '__default__'))"
                />
              </td>
              <td
                v-if="canEdit"
                class="px-4 py-3 align-top"
              >
                <UButton
                  size="xs"
                  :loading="isSaving(agent.id, tool.key)"
                  :disabled="isSaving(agent.id, tool.key)"
                  @click="onSave(agent, tool)"
                >
                  {{ t('common.save') }}
                </UButton>
              </td>
            </tr>
            <tr v-if="(agent.write_tools ?? []).length === 0">
              <td
                class="px-4 py-6 text-sm text-dimmed"
                :colspan="canEdit ? 6 : 5"
              >
                {{ t('settings.agentWritePolicy.noWriteTools') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
