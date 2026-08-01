<script setup lang="ts">
import type { NoticeChannel, NoticeType } from '~/types/delinquency'
import { formatMoney } from '~/composables/useMoney'

const props = defineProps<{
  contractId: number
  currency?: string | null
  unitId?: number | null
}>()

const { t, locale } = useI18n()
const toast = useToast()

const {
  delinquencyCase,
  pending,
  error,
  refresh,
  assessFee,
  placeOverlock,
  releaseOverlock,
  recordNotice,
  pause,
  resume,
  writeOff,
  markNoticeSent
} = useDelinquencyCase(() => props.contractId)

const actionPending = ref(false)
const showFee = ref(false)
const showNotice = ref(false)
const showPause = ref(false)
const showWriteOff = ref(false)
const showMarkSent = ref(false)
const markSentNoticeId = ref<number | null>(null)

const feeAmount = ref('')
const feeReason = ref('')
const noticeType = ref<NoticeType>('overdue')
const pauseReason = ref('')
const writeOffReason = ref('')
const sentChannel = ref<NoticeChannel>('email')
const sentTo = ref('')

const noticeTypeOptions = computed(() =>
  (['payment_reminder', 'overdue', 'final_demand', 'retention'] as NoticeType[]).map(value => ({
    value,
    label: t(`billing.delinquency.noticeTypes.${value}`)
  }))
)

const channelOptions = computed(() =>
  (['email', 'sms', 'post', 'in_person'] as NoticeChannel[]).map(value => ({
    value,
    label: t(`billing.delinquency.channels.${value}`)
  }))
)

watch(delinquencyCase, (c) => {
  if (c?.fee_suggestion?.amount) {
    feeAmount.value = c.fee_suggestion.amount
  }
}, { immediate: true })

async function run(action: () => Promise<unknown>, successKey: string) {
  actionPending.value = true
  try {
    await action()
    toast.add({ title: t(successKey), color: 'success' })
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? String((e as { data?: { message?: string } }).data?.message ?? t('billing.delinquency.actionError'))
      : t('billing.delinquency.actionError')
    toast.add({ title: msg, color: 'error' })
  } finally {
    actionPending.value = false
  }
}

async function onAssessFee() {
  await run(() => assessFee(feeAmount.value, feeReason.value), 'billing.delinquency.toast.fee')
  showFee.value = false
  feeReason.value = ''
}

async function onRecordNotice() {
  await run(() => recordNotice(noticeType.value), 'billing.delinquency.toast.notice')
  showNotice.value = false
}

async function onPause() {
  await run(() => pause(pauseReason.value), 'billing.delinquency.toast.paused')
  showPause.value = false
  pauseReason.value = ''
}

async function onWriteOff() {
  await run(() => writeOff(writeOffReason.value), 'billing.delinquency.toast.writeOff')
  showWriteOff.value = false
  writeOffReason.value = ''
}

async function onMarkSent() {
  if (markSentNoticeId.value == null) return
  await run(
    () => markNoticeSent(markSentNoticeId.value!, sentChannel.value, null, sentTo.value || null),
    'billing.delinquency.toast.markSent'
  )
  showMarkSent.value = false
  markSentNoticeId.value = null
  sentTo.value = ''
}

function openMarkSent(noticeId: number) {
  markSentNoticeId.value = noticeId
  showMarkSent.value = true
}

function printTimeline() {
  window.print()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="pending && !delinquencyCase"
      class="flex min-h-40 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="t('billing.delinquency.loadError')"
      :actions="[{ label: t('common.retry'), onClick: () => refresh() }]"
    />

    <div
      v-else-if="!delinquencyCase"
      class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
    >
      <p class="text-sm text-dimmed">
        {{ t('billing.delinquency.noCase') }}
      </p>
    </div>

    <template v-else>
      <UCard class="print:shadow-none">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base font-semibold text-highlighted">
                {{ t('billing.delinquency.caseTitle', { id: delinquencyCase.id }) }}
              </h2>
              <UBadge
                v-if="delinquencyCase.is_open"
                color="error"
                variant="subtle"
                :label="t('billing.delinquency.tabs.open')"
              />
              <UBadge
                v-else
                color="success"
                variant="subtle"
                :label="t('billing.delinquency.cured')"
              />
              <UBadge
                v-if="delinquencyCase.is_paused"
                color="neutral"
                variant="subtle"
                :label="t('billing.delinquency.paused')"
              />
              <UIcon
                v-if="delinquencyCase.overlocked"
                name="i-lucide-lock"
                class="size-4 text-error"
              />
            </div>
            <dl class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div class="flex gap-2">
                <dt class="text-muted">
                  {{ t('billing.delinquency.openedOn') }}
                </dt>
                <dd>{{ delinquencyCase.opened_on }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-muted">
                  {{ t('billing.delinquency.anchor') }}
                </dt>
                <dd>{{ delinquencyCase.anchor_due_date }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-muted">
                  {{ t('billing.delinquency.columns.daysOverdue') }}
                </dt>
                <dd>
                  {{ delinquencyCase.days_overdue != null
                    ? t('billing.delinquency.daysCount', { days: delinquencyCase.days_overdue })
                    : t('common.emptyValue') }}
                </dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-muted">
                  {{ t('billing.delinquency.policy') }}
                </dt>
                <dd>{{ delinquencyCase.policy_name ?? t('common.emptyValue') }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-muted">
                  {{ t('billing.delinquency.columns.overdue') }}
                </dt>
                <dd class="tabular-nums text-error">
                  {{ formatMoney(
                    delinquencyCase.overdue_total,
                    delinquencyCase.currency ?? currency,
                    locale
                  ) }}
                </dd>
              </div>
            </dl>
            <BillingDelinquencyLadderDots
              class="mt-2"
              :steps="delinquencyCase.policy_steps"
              :executed-ids="delinquencyCase.executed_policy_step_ids"
              :next-step="delinquencyCase.next_step"
            />
          </div>

          <div
            v-if="delinquencyCase.is_open"
            class="delinquency-actions flex flex-wrap gap-2 print:hidden"
          >
            <UButton
              size="sm"
              variant="soft"
              :label="t('billing.delinquency.actions.assess_late_fee')"
              :loading="actionPending"
              @click="showFee = true"
            />
            <UButton
              size="sm"
              variant="soft"
              :label="t('billing.delinquency.actions.place_overlock')"
              :loading="actionPending"
              @click="run(() => placeOverlock(unitId), 'billing.delinquency.toast.overlock')"
            />
            <UButton
              v-if="delinquencyCase.overlocked"
              size="sm"
              variant="soft"
              :label="t('billing.delinquency.actions.release_overlock')"
              :loading="actionPending"
              @click="run(() => releaseOverlock(unitId), 'billing.delinquency.toast.release')"
            />
            <UButton
              size="sm"
              variant="soft"
              :label="t('billing.delinquency.actions.record_notice')"
              :loading="actionPending"
              @click="showNotice = true"
            />
            <UButton
              v-if="!delinquencyCase.is_paused"
              size="sm"
              variant="soft"
              :label="t('billing.delinquency.actions.pause')"
              :loading="actionPending"
              @click="showPause = true"
            />
            <UButton
              v-else
              size="sm"
              variant="soft"
              :label="t('billing.delinquency.actions.resume')"
              :loading="actionPending"
              @click="run(() => resume(), 'billing.delinquency.toast.resumed')"
            />
            <UButton
              size="sm"
              color="error"
              variant="soft"
              :label="t('billing.delinquency.actions.write_off')"
              :loading="actionPending"
              @click="showWriteOff = true"
            />
            <UButton
              size="sm"
              variant="ghost"
              icon="i-lucide-printer"
              :label="t('billing.delinquency.print')"
              @click="printTimeline"
            />
          </div>
        </div>
      </UCard>

      <BillingDelinquencyTimeline
        :steps="delinquencyCase.timeline ?? []"
        :currency="delinquencyCase.currency ?? currency"
        @mark-sent="openMarkSent"
      />
    </template>

    <UModal v-model:open="showFee">
      <template #content>
        <UCard>
          <template #header>
            {{ t('billing.delinquency.actions.assess_late_fee') }}
          </template>
          <div class="flex flex-col gap-3">
            <UFormField :label="t('billing.delinquency.feeAmount')">
              <UInput
                v-model="feeAmount"
                type="text"
              />
            </UFormField>
            <UFormField :label="t('billing.delinquency.reason')">
              <UTextarea v-model="feeReason" />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="t('common.cancel')"
                @click="showFee = false"
              />
              <UButton
                :label="t('billing.delinquency.submit')"
                :disabled="!feeAmount || !feeReason"
                :loading="actionPending"
                @click="onAssessFee"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showNotice">
      <template #content>
        <UCard>
          <template #header>
            {{ t('billing.delinquency.actions.record_notice') }}
          </template>
          <UFormField :label="t('billing.delinquency.noticeType')">
            <USelect
              v-model="noticeType"
              :items="noticeTypeOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="t('common.cancel')"
                @click="showNotice = false"
              />
              <UButton
                :label="t('billing.delinquency.submit')"
                :loading="actionPending"
                @click="onRecordNotice"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showPause">
      <template #content>
        <UCard>
          <template #header>
            {{ t('billing.delinquency.actions.pause') }}
          </template>
          <UFormField :label="t('billing.delinquency.reason')">
            <UTextarea v-model="pauseReason" />
          </UFormField>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="t('common.cancel')"
                @click="showPause = false"
              />
              <UButton
                :label="t('billing.delinquency.submit')"
                :disabled="!pauseReason"
                :loading="actionPending"
                @click="onPause"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showWriteOff">
      <template #content>
        <UCard>
          <template #header>
            {{ t('billing.delinquency.actions.write_off') }}
          </template>
          <UAlert
            class="mb-3"
            color="warning"
            variant="subtle"
            :title="t('billing.delinquency.writeOffWarning')"
            :description="t('billing.delinquency.writeOffWarningBody')"
          />
          <UFormField :label="t('billing.delinquency.reason')">
            <UTextarea v-model="writeOffReason" />
          </UFormField>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="t('common.cancel')"
                @click="showWriteOff = false"
              />
              <UButton
                color="error"
                :label="t('billing.delinquency.actions.write_off')"
                :disabled="!writeOffReason"
                :loading="actionPending"
                @click="onWriteOff"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showMarkSent">
      <template #content>
        <UCard>
          <template #header>
            {{ t('billing.delinquency.markSent') }}
          </template>
          <div class="flex flex-col gap-3">
            <UFormField :label="t('billing.delinquency.channel')">
              <USelect
                v-model="sentChannel"
                :items="channelOptions"
                value-key="value"
                label-key="label"
              />
            </UFormField>
            <UFormField :label="t('billing.delinquency.sentTo')">
              <UInput v-model="sentTo" />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="t('common.cancel')"
                @click="showMarkSent = false"
              />
              <UButton
                :label="t('billing.delinquency.markSent')"
                :loading="actionPending"
                @click="onMarkSent"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
