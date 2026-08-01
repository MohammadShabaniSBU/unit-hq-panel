<script setup lang="ts">
import type {
  ApiDelinquencyPolicy,
  ApiDelinquencyPolicyStep,
  DelinquencyPolicyAction,
  LateFeeType,
  NoticeType
} from '~/types/delinquency'

const open = defineModel<boolean>('open', { default: false })
const policy = defineModel<ApiDelinquencyPolicy | null>('policy', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { post, patch } = useApi()

interface StepDraft {
  key: string
  offset_days: number
  action: DelinquencyPolicyAction
  fee_type: LateFeeType
  amount: string
  percent: string
  cap_per_case: string
  notice_type: NoticeType
  title_key: string
  urgent: boolean
}

function emptyStep(): StepDraft {
  return {
    key: crypto.randomUUID(),
    offset_days: 0,
    action: 'assess_late_fee',
    fee_type: 'percent',
    amount: '',
    percent: '10.00',
    cap_per_case: '',
    notice_type: 'overdue',
    title_key: 'delinquency.task.final_demand',
    urgent: false
  }
}

function stepFromApi(step: ApiDelinquencyPolicyStep): StepDraft {
  const params = step.params as Record<string, unknown>
  return {
    key: String(step.id ?? crypto.randomUUID()),
    offset_days: step.offset_days,
    action: step.action,
    fee_type: (params.type as LateFeeType | undefined) ?? 'percent',
    amount: String(params.amount ?? ''),
    percent: String(params.percent ?? ''),
    cap_per_case: String(params.cap_per_case ?? ''),
    notice_type: (params.notice_type as NoticeType | undefined) ?? 'overdue',
    title_key: String(params.title_key ?? 'delinquency.task.final_demand'),
    urgent: Boolean(params.urgent)
  }
}

const name = ref('')
const autoReleaseOverlock = ref(true)
const steps = ref<Array<StepDraft>>([emptyStep()])
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, Array<string>>>({})

const isEditing = computed(() => policy.value != null)

const title = computed(() =>
  isEditing.value
    ? t('pages.settings.delinquency.editTitle')
    : t('pages.settings.delinquency.createTitle')
)

const actionItems = computed(() => [
  { value: 'assess_late_fee', label: t('pages.settings.delinquency.actions.assess_late_fee'), disabled: false },
  { value: 'place_overlock', label: t('pages.settings.delinquency.actions.place_overlock'), disabled: false },
  { value: 'record_notice', label: t('pages.settings.delinquency.actions.record_notice'), disabled: false },
  { value: 'create_task', label: t('pages.settings.delinquency.actions.create_task'), disabled: false },
  {
    value: 'revoke_access',
    label: t('pages.settings.delinquency.actions.revoke_access'),
    disabled: true
  }
])

const feeTypeItems = computed(() => [
  { value: 'flat', label: t('pages.settings.delinquency.feeTypes.flat') },
  { value: 'percent', label: t('pages.settings.delinquency.feeTypes.percent') }
])

const noticeTypeItems = computed(() => [
  { value: 'payment_reminder', label: t('pages.settings.delinquency.noticeTypes.payment_reminder') },
  { value: 'overdue', label: t('pages.settings.delinquency.noticeTypes.overdue') },
  { value: 'final_demand', label: t('pages.settings.delinquency.noticeTypes.final_demand') },
  { value: 'retention', label: t('pages.settings.delinquency.noticeTypes.retention') }
])

function fieldError(nameKey: string) {
  return fieldErrors.value[nameKey]?.[0]
}

function reset() {
  name.value = ''
  autoReleaseOverlock.value = true
  steps.value = [emptyStep()]
  error.value = null
  fieldErrors.value = {}
}

function load(current: ApiDelinquencyPolicy | null) {
  reset()
  if (!current) {
    return
  }

  name.value = current.name
  autoReleaseOverlock.value = current.auto_release_overlock
  steps.value = current.steps.length > 0
    ? current.steps.map(stepFromApi)
    : [emptyStep()]
}

watch([open, policy], ([isOpen, current]) => {
  if (isOpen) {
    load(current)
  }
})

function addStep() {
  steps.value.push(emptyStep())
}

function removeStep(index: number) {
  if (steps.value.length <= 1) {
    return
  }
  steps.value.splice(index, 1)
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= steps.value.length) {
    return
  }
  const copy = [...steps.value]
  const [row] = copy.splice(index, 1)
  copy.splice(target, 0, row!)
  steps.value = copy
}

function buildStepPayload(step: StepDraft, sort: number) {
  let params: Record<string, unknown> = {}

  if (step.action === 'assess_late_fee') {
    params = { type: step.fee_type }
    if (step.fee_type === 'flat') {
      params.amount = step.amount.trim()
    } else {
      params.percent = step.percent.trim()
    }
    if (step.cap_per_case.trim()) {
      params.cap_per_case = step.cap_per_case.trim()
    }
  } else if (step.action === 'record_notice') {
    params = { notice_type: step.notice_type }
  } else if (step.action === 'create_task') {
    params = { title_key: step.title_key.trim(), urgent: step.urgent }
  }

  return {
    offset_days: Number(step.offset_days),
    action: step.action,
    params,
    sort
  }
}

async function onSubmit() {
  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  const payload = {
    name: name.value.trim(),
    auto_release_overlock: autoReleaseOverlock.value,
    steps: steps.value.map((step, index) => buildStepPayload(step, index))
  }

  try {
    if (policy.value?.id != null) {
      await patch(`/api/delinquency-policies/${policy.value.id}`, payload)
    } else {
      await post('/api/delinquency-policies', payload)
    }

    toast.add({
      title: isEditing.value
        ? t('pages.settings.delinquency.saveSuccess')
        : t('pages.settings.delinquency.createSuccess'),
      color: 'success'
    })
    emit('saved')
    open.value = false
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { message?: string, errors?: Record<string, Array<string>> }
    }
    fieldErrors.value = fetchError.data?.errors ?? {}
    error.value = fetchError.data?.message
      ?? t('pages.settings.delinquency.saveError')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="title"
  >
    <template #body>
      <form
        class="flex flex-col gap-5"
        @submit.prevent="onSubmit"
      >
        <UAlert
          color="info"
          variant="subtle"
          :title="$t('pages.settings.delinquency.livePolicyHelp')"
          :description="$t('pages.settings.delinquency.livePolicyHelpDetail')"
        />

        <UFormField
          :label="$t('pages.settings.delinquency.name')"
          name="name"
          required
          :error="fieldError('name')"
        >
          <UInput
            v-model="name"
            class="w-full"
          />
        </UFormField>

        <UCheckbox
          v-model="autoReleaseOverlock"
          :label="$t('pages.settings.delinquency.autoReleaseOverlock')"
        />

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-medium text-highlighted">
              {{ $t('pages.settings.delinquency.steps') }}
            </h3>
            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              @click="addStep"
            >
              {{ $t('pages.settings.delinquency.addStep') }}
            </UButton>
          </div>

          <div
            v-for="(step, index) in steps"
            :key="step.key"
            class="rounded-lg border border-default p-3 flex flex-col gap-3"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-xs text-dimmed">
                {{ $t('pages.settings.delinquency.stepN', { n: index + 1 }) }}
              </p>
              <div class="flex items-center gap-0.5">
                <UButton
                  type="button"
                  icon="i-lucide-arrow-up"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :disabled="index === 0"
                  @click="moveStep(index, -1)"
                />
                <UButton
                  type="button"
                  icon="i-lucide-arrow-down"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :disabled="index === steps.length - 1"
                  @click="moveStep(index, 1)"
                />
                <UButton
                  type="button"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :disabled="steps.length <= 1"
                  @click="removeStep(index)"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <UFormField
                :label="$t('pages.settings.delinquency.offsetDays')"
                :name="`steps.${index}.offset_days`"
                required
                :error="fieldError(`steps.${index}.offset_days`)"
              >
                <UInput
                  v-model.number="step.offset_days"
                  type="number"
                  min="0"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('pages.settings.delinquency.action')"
                :name="`steps.${index}.action`"
                required
                :error="fieldError(`steps.${index}.action`)"
                :help="step.action === 'revoke_access' ? $t('pages.settings.delinquency.revokeAccessHint') : undefined"
              >
                <USelect
                  v-model="step.action"
                  :items="actionItems"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
            </div>

            <template v-if="step.action === 'assess_late_fee'">
              <UFormField
                :label="$t('pages.settings.delinquency.feeType')"
                :name="`steps.${index}.params.type`"
              >
                <USelect
                  v-model="step.fee_type"
                  :items="feeTypeItems"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  v-if="step.fee_type === 'flat'"
                  :label="$t('pages.settings.delinquency.amount')"
                  :name="`steps.${index}.params.amount`"
                  :error="fieldError(`steps.${index}.params.amount`)"
                >
                  <UInput
                    v-model="step.amount"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  v-else
                  :label="$t('pages.settings.delinquency.percent')"
                  :name="`steps.${index}.params.percent`"
                  :error="fieldError(`steps.${index}.params.percent`)"
                >
                  <UInput
                    v-model="step.percent"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  :label="$t('pages.settings.delinquency.capPerCase')"
                  :name="`steps.${index}.params.cap_per_case`"
                  :error="fieldError(`steps.${index}.params.cap_per_case`)"
                >
                  <UInput
                    v-model="step.cap_per_case"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </template>

            <UFormField
              v-else-if="step.action === 'record_notice'"
              :label="$t('pages.settings.delinquency.noticeType')"
              :name="`steps.${index}.params.notice_type`"
              :error="fieldError(`steps.${index}.params.notice_type`)"
            >
              <USelect
                v-model="step.notice_type"
                :items="noticeTypeItems"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <template v-else-if="step.action === 'create_task'">
              <UFormField
                :label="$t('pages.settings.delinquency.titleKey')"
                :name="`steps.${index}.params.title_key`"
                :error="fieldError(`steps.${index}.params.title_key`)"
              >
                <UInput
                  v-model="step.title_key"
                  class="w-full"
                />
              </UFormField>
              <UCheckbox
                v-model="step.urgent"
                :label="$t('pages.settings.delinquency.urgent')"
              />
            </template>

            <p
              v-else-if="step.action === 'revoke_access'"
              class="text-xs text-dimmed"
            >
              {{ $t('pages.settings.delinquency.revokeAccessHint') }}
            </p>
          </div>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :title="error"
        />

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false"
          >
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
          >
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </USlideover>
</template>
