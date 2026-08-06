<script setup lang="ts">
import type { ApiSite } from '~/types/facility'
import type { ApiDelinquencyPoliciesPayload } from '~/types/delinquency'
import type { DealStatus } from '~/types/deal'
import { DEAL_STATUSES } from '~/types/deal'
import type {
  EnrolmentFilters,
  Playbook,
  PlaybookStep,
  PlaybookStepAction
} from '~/types/playbook'
import { actionIcon, playbookKindConfig } from '~/config/playbookKinds'

type LeadStage = Exclude<DealStatus, 'closed_won' | 'closed_lost'>
type BuilderAction = Exclude<PlaybookStepAction, 'record_notice'>

const props = defineProps<{
  playbook: Playbook
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const { getPaginated, get } = useApi()
const { save, setActive, saving, toggling, refresh } = usePlaybook(() => props.playbook.id)

const config = computed(() => playbookKindConfig(props.playbook.kind))

const name = ref(props.playbook.name)
const isActive = ref(props.playbook.isActive)
const filters = ref<EnrolmentFilters>({ ...props.playbook.enrolmentFilters })
const steps = ref<Array<PlaybookStep>>(
  props.playbook.steps.map(s => ({
    ...s,
    params: { ...s.params }
  }))
)
const expanded = ref<number | null>(steps.value.length > 0 ? 0 : null)
const showVersionDialog = ref(false)
const exitInflight = ref(false)
const howOpen = ref(false)

watch(() => props.playbook, (pb) => {
  name.value = pb.name
  isActive.value = pb.isActive
  filters.value = { ...pb.enrolmentFilters }
  steps.value = pb.steps.map(s => ({ ...s, params: { ...s.params } }))
}, { deep: true })

const { data: sitesData } = useAsyncData('playbook-sites', () =>
  getPaginated<ApiSite>('/api/sites', { per_page: 100, status: 'active' })
)
const siteOptions = computed(() =>
  (sitesData.value?.data ?? []).map(s => ({ label: s.name, value: s.id }))
)

const { data: policiesData } = useAsyncData(
  'playbook-policies',
  async () => {
    if (props.playbook.kind !== 'debt_process') return []
    const res = await get<ApiDelinquencyPoliciesPayload>('/api/delinquency-policies', { status: 'active' })
    return res.data.policies ?? []
  }
)
const policyOptions = computed(() =>
  (policiesData.value ?? []).map(p => ({ label: p.name, value: p.id }))
)

const { templates } = useEmailTemplatesList()
const templateOptions = computed(() =>
  templates.value.map(tpl => ({ label: tpl.name, value: tpl.id }))
)

const { templates: smsTemplates } = useSmsTemplatesList()
const smsTemplateOptions = computed(() =>
  smsTemplates.value.map(tpl => ({ label: tpl.name, value: tpl.id as number | undefined }))
)

const { templates: waTemplatesList } = useWhatsappTemplatesList()
const waTemplateNameOptions = computed(() => {
  const names = new Set(
    waTemplatesList.value
      .filter(t => t.status === 'approved')
      .map(t => t.name)
  )
  return Array.from(names).sort().map(name => ({ label: name, value: name }))
})

const selectedWaTemplateMeta = computed(() => {
  const step = expanded.value !== null ? steps.value[expanded.value] : null
  if (!step || step.action !== 'send_whatsapp_template' || !step.params.whatsapp_template_name) {
    return null
  }
  return waTemplatesList.value.find(
    t => t.name === step.params.whatsapp_template_name && t.status === 'approved'
  ) ?? waTemplatesList.value.find(t => t.name === step.params.whatsapp_template_name) ?? null
})

const stageOptions = computed(() =>
  DEAL_STATUSES.filter(s => s !== 'closed_won' && s !== 'closed_lost').map(status => ({
    label: t(`dealStatus.${status}`),
    value: status
  }))
)

const noticeOptions = computed(() =>
  config.value.noticeTypes.map(type => ({
    label: t(`billing.delinquency.noticeTypes.${type}`),
    value: type
  }))
)

const noticeSelectItems = computed(() => [
  { label: t('playbooks.builder.noNotice'), value: null as string | null },
  ...noticeOptions.value
])

function noticeModel(step: PlaybookStep): string | null {
  const value = step.params.record_notice
  return typeof value === 'string' && value !== '' ? value : null
}

function setNotice(step: PlaybookStep, value: string | null | undefined) {
  step.params.record_notice = value || undefined
}

const actionOptions = computed(() =>
  config.value.allowedActions
    .filter((a): a is BuilderAction => a !== 'record_notice')
    .map(action => ({
      label: t(`playbooks.actions.${action}`),
      value: action
    }))
)

function actionModel(step: PlaybookStep): BuilderAction {
  return step.action === 'record_notice' ? 'send_email' : step.action
}

function waitLabel(index: number): string | null {
  if (index <= 0) return null
  const prev = steps.value[index - 1]?.offsetDays ?? 0
  const curr = steps.value[index]?.offsetDays ?? 0
  const delta = curr - prev
  if (delta <= 0) return t('playbooks.builder.noWait')
  return t('playbooks.builder.waitDays', { days: delta })
}

function nudgeOffsets() {
  let prev = 0
  for (const step of steps.value) {
    if (step.offsetDays < prev) {
      step.offsetDays = prev
    }
    prev = step.offsetDays
  }
}

function addStep(at: number) {
  const prevOffset = at > 0 ? (steps.value[at - 1]?.offsetDays ?? 0) : 0
  const step: PlaybookStep = {
    offsetDays: prevOffset,
    action: 'send_email',
    params: { label: '', subject: '', body: '' },
    sort: at
  }
  steps.value.splice(at, 0, step)
  nudgeOffsets()
  expanded.value = at
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
  nudgeOffsets()
  if (expanded.value === index) expanded.value = null
}

function moveStep(index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= steps.value.length) return
  const copy = [...steps.value]
  const [item] = copy.splice(index, 1)
  copy.splice(target, 0, item!)
  steps.value = copy
  nudgeOffsets()
  expanded.value = target
}

function onActionChange(step: PlaybookStep, action: BuilderAction) {
  step.action = action
  if (action === 'send_email') {
    step.params = { label: step.params.label, subject: '', body: '', template_family_id: undefined }
  } else if (action === 'send_sms') {
    step.params = { label: step.params.label, body: '', tokens: true, template_family_id: undefined }
  } else if (action === 'send_whatsapp_template') {
    step.params = { label: step.params.label, whatsapp_template_name: undefined, variable_tokens: {} }
  } else if (action === 'create_task') {
    step.params = { label: step.params.label, title: '', urgent: false }
  } else if (action === 'record_notice') {
    step.params = { label: step.params.label, notice_type: 'overdue' }
  }
}

function stepSummary(step: PlaybookStep): string {
  if (step.params.label) return step.params.label
  if (step.action === 'send_email') {
    return step.params.subject || t('playbooks.actions.send_email')
  }
  if (step.action === 'send_sms') {
    if (step.params.template_family_id) {
      const name = smsTemplates.value.find(tpl => tpl.id === step.params.template_family_id)?.name
      return name || t('playbooks.actions.send_sms')
    }
    const body = step.params.body ?? ''
    return body.length > 40 ? `${body.slice(0, 40)}…` : (body || t('playbooks.actions.send_sms'))
  }
  if (step.action === 'send_whatsapp_template') {
    return step.params.whatsapp_template_name || t('playbooks.actions.send_whatsapp_template')
  }
  if (step.action === 'create_task') {
    return step.params.title || t('playbooks.actions.create_task')
  }
  if (step.action === 'record_notice') {
    const type = step.params.notice_type ?? 'overdue'
    return t(`billing.delinquency.noticeTypes.${type}`)
  }
  return t(`playbooks.actions.${step.action}`)
}

function insertToken(step: PlaybookStep, field: 'subject' | 'body', token: string) {
  const current = String(step.params[field] ?? '')
  step.params[field] = `${current}${token}`
}

async function onToggleActive(value: boolean) {
  const result = await setActive(value)
  if (result) {
    isActive.value = result.isActive
  } else {
    isActive.value = props.playbook.isActive
  }
}

function requestSave() {
  nudgeOffsets()
  if (props.playbook.isActive && (props.playbook.activeEnrolmentCount ?? 0) > 0) {
    exitInflight.value = false
    showVersionDialog.value = true
    return
  }
  void doSave(false)
}

async function doSave(exit: boolean) {
  showVersionDialog.value = false
  const result = await save({
    name: name.value.trim() || props.playbook.name,
    enrolmentFilters: filters.value,
    steps: steps.value,
    exitInflight: exit
  })
  if (result) {
    emit('saved')
    await refresh()
  }
}

const debtFilters = computed({
  get: () => filters.value as { site_ids?: Array<number>, policy_ids?: Array<number>, min_days_overdue?: number },
  set: (v) => { filters.value = v }
})

const leadFilters = computed({
  get: () => filters.value as { site_ids?: Array<number>, stages?: Array<string> },
  set: (v) => { filters.value = v }
})

const selectedStages = computed({
  get: () => (leadFilters.value.stages ?? []) as Array<LeadStage>,
  set: (value: Array<LeadStage> | undefined) => {
    leadFilters.value = { ...leadFilters.value, stages: value as Array<string> | undefined }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="rounded-xl border border-default bg-elevated/20 p-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-1 space-y-3">
          <UFormField :label="$t('playbooks.builder.name')">
            <UInput
              v-model="name"
              class="max-w-md"
            />
          </UFormField>
          <p class="text-sm text-highlighted">
            {{ $t(config.exitStatementKey) }}
          </p>
          <UButton
            :label="howOpen ? $t('playbooks.builder.hideHow') : $t('playbooks.builder.howItWorks')"
            color="neutral"
            variant="link"
            size="xs"
            class="px-0"
            @click="howOpen = !howOpen"
          />
          <p
            v-if="howOpen"
            class="max-w-2xl text-xs text-muted"
          >
            {{ $t(config.howItWorksKey) }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">{{ $t('playbooks.builder.active') }}</span>
          <USwitch
            :model-value="isActive"
            :disabled="toggling"
            @update:model-value="onToggleActive"
          />
          <UButton
            :label="$t('common.save')"
            color="primary"
            :loading="saving"
            @click="requestSave"
          />
        </div>
      </div>

      <!-- Filters -->
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <UFormField
          v-if="config.filterFields.includes('site_ids')"
          :label="$t('playbooks.filters.sites')"
        >
          <USelectMenu
            v-model="debtFilters.site_ids"
            :items="siteOptions"
            value-key="value"
            multiple
            class="w-full"
            :placeholder="$t('playbooks.filters.allSites')"
          />
        </UFormField>

        <template v-if="playbook.kind === 'debt_process'">
          <UFormField :label="$t('playbooks.filters.policies')">
            <USelectMenu
              v-model="debtFilters.policy_ids"
              :items="policyOptions"
              value-key="value"
              multiple
              class="w-full"
              :placeholder="$t('playbooks.filters.allPolicies')"
            />
          </UFormField>
          <UFormField :label="$t('playbooks.filters.minDays')">
            <UInput
              :model-value="debtFilters.min_days_overdue ?? undefined"
              type="number"
              min="0"
              class="w-full"
              @update:model-value="(v: string | number) => {
                const n = Number(v)
                debtFilters = {
                  ...debtFilters,
                  min_days_overdue: Number.isFinite(n) && n > 0 ? n : undefined
                }
              }"
            />
          </UFormField>
        </template>

        <template v-else>
          <UFormField :label="$t('playbooks.filters.stages')">
            <USelectMenu
              v-model="selectedStages"
              :items="stageOptions"
              value-key="value"
              multiple
              class="w-full"
              :placeholder="$t('playbooks.filters.allStages')"
            />
          </UFormField>
        </template>
      </div>
    </div>

    <!-- Timeline -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ $t('playbooks.builder.timeline') }}
        </h2>
        <UButton
          :label="$t('playbooks.builder.addStep')"
          icon="i-lucide-plus"
          size="sm"
          color="neutral"
          variant="outline"
          @click="addStep(steps.length)"
        />
      </div>

      <div
        v-if="steps.length === 0"
        class="rounded-xl border border-dashed border-default px-4 py-10 text-center"
      >
        <p class="text-sm text-muted">
          {{ $t('playbooks.builder.emptySteps') }}
        </p>
        <UButton
          class="mt-3"
          :label="$t('playbooks.builder.addStep')"
          icon="i-lucide-plus"
          size="sm"
          color="primary"
          @click="addStep(0)"
        />
      </div>

      <div
        v-for="(step, index) in steps"
        :key="index"
        class="space-y-2"
      >
        <p
          v-if="index > 0"
          class="pl-4 text-xs text-muted"
        >
          {{ waitLabel(index) }}
        </p>

        <div class="rounded-xl border border-default bg-default">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left"
            @click="expanded = expanded === index ? null : index"
          >
            <UBadge
              :label="$t('playbooks.builder.dayBadge', { day: step.offsetDays })"
              color="primary"
              variant="subtle"
              size="sm"
            />
            <UIcon
              :name="actionIcon(step.action)"
              class="size-4 text-dimmed"
            />
            <span class="flex-1 truncate text-sm font-medium text-highlighted">
              {{ stepSummary(step) }}
            </span>
            <UButton
              icon="i-lucide-arrow-up"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="index === 0"
              @click.stop="moveStep(index, -1)"
            />
            <UButton
              icon="i-lucide-arrow-down"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="index === steps.length - 1"
              @click.stop="moveStep(index, 1)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              @click.stop="removeStep(index)"
            />
          </button>

          <div
            v-if="expanded === index"
            class="space-y-3 border-t border-default px-4 py-4"
          >
            <div class="grid gap-3 md:grid-cols-3">
              <UFormField :label="$t('playbooks.builder.dayOffset')">
                <UInput
                  v-model.number="step.offsetDays"
                  type="number"
                  min="0"
                  @blur="nudgeOffsets"
                />
              </UFormField>
              <UFormField :label="$t('playbooks.builder.action')">
                <USelect
                  :model-value="actionModel(step)"
                  :items="actionOptions"
                  value-key="value"
                  class="w-full"
                  @update:model-value="(v: BuilderAction) => onActionChange(step, v)"
                />
              </UFormField>
              <UFormField :label="$t('playbooks.builder.label')">
                <UInput v-model="step.params.label" />
              </UFormField>
            </div>

            <!-- Email -->
            <template v-if="step.action === 'send_email'">
              <UFormField :label="$t('playbooks.builder.emailTemplate')">
                <USelectMenu
                  :model-value="step.params.template_family_id"
                  :items="templateOptions"
                  value-key="value"
                  class="w-full"
                  :placeholder="$t('playbooks.builder.inlineEmail')"
                  @update:model-value="(v: number | undefined) => {
                    step.params.template_family_id = v
                    if (v != null) {
                      step.params.body = undefined
                    }
                  }"
                />
              </UFormField>
              <div
                v-if="!step.params.template_family_id"
                class="space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted">{{ $t('playbooks.builder.subject') }}</span>
                  <PlaybooksTokenInsertMenu
                    :tokens="config.tokens"
                    @insert="(tok) => insertToken(step, 'subject', tok)"
                  />
                </div>
                <UInput v-model="step.params.subject" />
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted">{{ $t('playbooks.builder.body') }}</span>
                  <PlaybooksTokenInsertMenu
                    :tokens="config.tokens"
                    @insert="(tok) => insertToken(step, 'body', tok)"
                  />
                </div>
                <UTextarea
                  v-model="step.params.body"
                  :rows="4"
                />
              </div>
              <UFormField
                v-if="config.noticePairing"
                :label="$t('playbooks.builder.recordNotice')"
              >
                <USelectMenu
                  :model-value="noticeModel(step)"
                  :items="noticeSelectItems"
                  value-key="value"
                  class="w-full"
                  @update:model-value="(v: string | null) => setNotice(step, v)"
                />
              </UFormField>
            </template>

            <!-- SMS -->
            <template v-else-if="step.action === 'send_sms'">
              <UFormField :label="$t('playbooks.builder.smsTemplate')">
                <USelectMenu
                  :model-value="step.params.template_family_id"
                  :items="[{ label: $t('playbooks.builder.inlineSms'), value: undefined }, ...smsTemplateOptions]"
                  value-key="value"
                  class="w-full"
                  :placeholder="$t('playbooks.builder.inlineSms')"
                  @update:model-value="(v: number | undefined) => {
                    step.params.template_family_id = v
                    if (v != null) {
                      step.params.body = undefined
                    } else if (step.params.body === undefined) {
                      step.params.body = ''
                    }
                  }"
                />
              </UFormField>
              <template v-if="!step.params.template_family_id">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted">{{ $t('playbooks.builder.body') }}</span>
                  <PlaybooksTokenInsertMenu
                    :tokens="config.tokens"
                    @insert="(tok) => insertToken(step, 'body', tok)"
                  />
                </div>
                <UTextarea
                  v-model="step.params.body"
                  :rows="3"
                />
                <p class="text-xs text-muted">
                  {{ $t('playbooks.builder.charCount', { count: (step.params.body ?? '').length }) }}
                  ·
                  {{ $t('inbox.composer.smsSegments', {
                    count: countSmsSegments(step.params.body ?? '').segments,
                    chars: countSmsSegments(step.params.body ?? '').length
                  }) }}
                </p>
              </template>
              <UFormField
                v-if="config.noticePairing"
                :label="$t('playbooks.builder.recordNotice')"
              >
                <USelectMenu
                  :model-value="noticeModel(step)"
                  :items="noticeSelectItems"
                  value-key="value"
                  class="w-full"
                  @update:model-value="(v: string | null) => setNotice(step, v)"
                />
              </UFormField>
            </template>

            <!-- WhatsApp template -->
            <template v-else-if="step.action === 'send_whatsapp_template'">
              <UFormField :label="$t('playbooks.builder.whatsappTemplate')">
                <USelectMenu
                  :model-value="step.params.whatsapp_template_name"
                  :items="waTemplateNameOptions"
                  value-key="value"
                  class="w-full"
                  :placeholder="$t('playbooks.builder.whatsappTemplatePlaceholder')"
                  @update:model-value="(v: string | undefined) => {
                    step.params.whatsapp_template_name = v
                    const meta = waTemplatesList.find(t => t.name === v && t.status === 'approved')
                      ?? waTemplatesList.find(t => t.name === v)
                    const tokens: Record<string, string> = {}
                    for (const variable of meta?.variables ?? []) {
                      tokens[String(variable.index)] = variable.token_default ?? ''
                    }
                    step.params.variable_tokens = tokens
                  }"
                />
              </UFormField>
              <div
                v-if="selectedWaTemplateMeta"
                class="space-y-2"
              >
                <p class="text-xs text-muted">
                  {{ $t('playbooks.builder.whatsappCategoryHint', { category: selectedWaTemplateMeta.category }) }}
                </p>
                <div
                  v-for="variable in selectedWaTemplateMeta.variables"
                  :key="variable.index"
                  class="space-y-1"
                >
                  <label class="text-xs font-medium text-muted">
                    {{ variable.label || $t('inbox.composer.whatsappVariable', { index: variable.index }) }}
                  </label>
                  <UInput
                    :model-value="step.params.variable_tokens?.[String(variable.index)] ?? ''"
                    size="sm"
                    :placeholder="variable.token_default ?? 'contact.first_name'"
                    @update:model-value="(v: string) => {
                      step.params.variable_tokens = {
                        ...(step.params.variable_tokens ?? {}),
                        [String(variable.index)]: v
                      }
                    }"
                  />
                </div>
              </div>
            </template>

            <!-- Task -->
            <template v-else-if="step.action === 'create_task'">
              <UFormField :label="$t('playbooks.builder.taskTitle')">
                <UInput v-model="step.params.title" />
              </UFormField>
              <UCheckbox
                :model-value="!!step.params.urgent"
                :label="$t('playbooks.builder.urgent')"
                @update:model-value="(v: boolean | 'indeterminate') => { step.params.urgent = v === true }"
              />
            </template>
          </div>
        </div>

        <div class="flex justify-center">
          <UButton
            icon="i-lucide-plus"
            size="xs"
            color="neutral"
            variant="ghost"
            :aria-label="$t('playbooks.builder.addStep')"
            @click="addStep(index + 1)"
          />
        </div>
      </div>
    </div>

    <!-- Version dialog -->
    <UModal v-model:open="showVersionDialog">
      <template #content>
        <div class="p-6">
          <h2 class="text-base font-semibold text-highlighted">
            {{ $t('playbooks.builder.versionTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('playbooks.builder.versionBody', { count: playbook.activeEnrolmentCount ?? 0 }) }}
          </p>
          <UCheckbox
            v-model="exitInflight"
            class="mt-4"
            :label="$t('playbooks.builder.exitInflight')"
          />
          <div class="mt-6 flex justify-end gap-2">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="outline"
              @click="showVersionDialog = false"
            />
            <UButton
              :label="$t('common.save')"
              color="primary"
              :loading="saving"
              @click="doSave(exitInflight)"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
