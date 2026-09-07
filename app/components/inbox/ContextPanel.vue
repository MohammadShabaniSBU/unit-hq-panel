<script setup lang="ts">
import type { ApiInboxContext, InboxAutopayStatus } from '~/types/inbox'

const props = defineProps<{
  context: ApiInboxContext | null
  pending: boolean
  threadId: number | null
}>()

const emit = defineEmits<{
  paymentInserted: [url: string]
  invalidate: []
}>()

const { t } = useI18n()
const toast = useToast()
const { formatMoney } = useMoney()
const { formatRelativeActivity } = useContactFormatters()
const { formatDate } = useOrgDateFormat()

const paymentFlowRef = ref<{ start: () => void, loading: boolean } | null>(null)
const addTaskOpen = ref(false)

const contact = computed(() => props.context?.contact ?? null)
const activeContracts = computed(() => props.context?.tenancy.active_contracts ?? [])
const pipeline = computed(() => props.context?.pipeline ?? null)
const recent = computed(() => props.context?.recent ?? [])

const initials = computed(() => {
  const name = contact.value?.name?.trim()
  if (!name) {
    return '—'
  }

  return name
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

function channelFor(type: string) {
  return contact.value?.channels.find(channel => channel.type === type) ?? null
}

const emailSuppressed = computed(() => channelFor('email')?.suppressed ?? false)
const phoneSuppressed = computed(() => channelFor('phone')?.suppressed ?? false)

function autopayColor(status: InboxAutopayStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'on') {
    return 'success'
  }
  if (status === 'failing') {
    return 'warning'
  }
  return 'neutral'
}

const recentIcon: Record<string, string> = {
  email: 'i-lucide-mail',
  sms: 'i-lucide-message-square',
  whatsapp: 'i-lucide-message-circle',
  call: 'i-lucide-phone'
}

function iconFor(type: string) {
  return recentIcon[type] ?? 'i-lucide-activity'
}

function onRequestPayment() {
  paymentFlowRef.value?.start()
}

function onPaymentCreated(url: string) {
  emit('paymentInserted', url)
  emit('invalidate')
  toast.add({ title: t('inbox.quickActions.requestPayment.successMessage'), color: 'success' })
}

function onSendOffer() {
  const returnTo = props.threadId !== null ? `/inbox?thread=${props.threadId}` : '/inbox'
  const query = new URLSearchParams({ new: '1', return_to: returnTo })

  if (contact.value?.id) {
    query.set('contact_id', String(contact.value.id))
  }
  if (pipeline.value?.open_deal?.id) {
    query.set('deal_id', String(pipeline.value.open_deal.id))
  }

  navigateTo(`/leasing/offers?${query.toString()}`)
}

function onTaskSaved() {
  emit('invalidate')
}
</script>

<template>
  <div class="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-default bg-default xl:flex">
    <div
      v-if="pending && !context"
      class="flex h-full items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <template v-else-if="context">
      <div class="min-h-0 flex-1 overflow-y-auto">
        <!-- Contact card -->
        <section class="border-b border-default p-4">
          <template v-if="contact">
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {{ initials }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="truncate text-sm font-semibold text-highlighted">
                    {{ contact.name || t('inbox.row.unknownContact') }}
                  </span>
                  <UBadge
                    v-if="contact.status"
                    :label="t(`status.contact.${contact.status}`)"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  />
                </div>

                <div
                  v-if="contact.email"
                  class="mt-1.5 flex items-center gap-1.5 text-xs text-dimmed"
                >
                  <UIcon
                    name="i-lucide-mail"
                    class="size-3.5 shrink-0"
                  />
                  <span class="truncate">{{ contact.email }}</span>
                  <UTooltip
                    v-if="emailSuppressed"
                    :text="t('inbox.context.suppressedTooltip')"
                  >
                    <UIcon
                      name="i-lucide-ban"
                      class="size-3.5 shrink-0 text-error"
                    />
                  </UTooltip>
                </div>

                <div
                  v-if="contact.phone"
                  class="mt-1 flex items-center gap-1.5 text-xs text-dimmed"
                >
                  <UIcon
                    name="i-lucide-phone"
                    class="size-3.5 shrink-0"
                  />
                  <span class="truncate">{{ contact.phone }}</span>
                  <UTooltip
                    v-if="phoneSuppressed"
                    :text="t('inbox.context.suppressedTooltip')"
                  >
                    <UIcon
                      name="i-lucide-ban"
                      class="size-3.5 shrink-0 text-error"
                    />
                  </UTooltip>
                  <CallsCallButton
                    v-if="contact.id"
                    :contact-id="contact.id"
                    :to-number="contact.phone"
                    :context-type="'thread'"
                    :context-id="threadId"
                    icon-only
                    size="xs"
                    color="neutral"
                    variant="ghost"
                  />
                </div>

                <NuxtLink
                  v-if="contact.id"
                  :to="`/leasing/contacts/${contact.id}`"
                  class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {{ t('inbox.context.viewContact') }}
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="size-3"
                  />
                </NuxtLink>
              </div>
            </div>
          </template>

          <div
            v-else
            class="flex flex-col items-center gap-2 py-3 text-center"
          >
            <UIcon
              name="i-lucide-user-round-x"
              class="size-6 text-dimmed"
            />
            <p class="text-xs text-dimmed">
              {{ t('inbox.context.noContact') }}
            </p>
          </div>
        </section>

        <!-- Tenancy -->
        <section
          v-if="activeContracts.length > 0"
          class="flex flex-col gap-3 border-b border-default p-4"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
            {{ t('inbox.context.tenancyTitle') }}
          </p>

          <div
            v-for="contractBlock in activeContracts"
            :key="contractBlock.id"
            class="flex flex-col gap-2 rounded-lg border border-default p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ contractBlock.unit_number ?? `#${contractBlock.id}` }}
                <span
                  v-if="contractBlock.site_name"
                  class="font-normal text-dimmed"
                >· {{ contractBlock.site_name }}</span>
              </p>
              <span class="shrink-0 text-xs text-dimmed">
                {{ t('inbox.context.monthlyDisplay', {
                  amount: formatMoney(contractBlock.monthly_display.amount, contractBlock.monthly_display.currency)
                }) }}
              </span>
            </div>

            <template v-if="contractBlock.status === 'awaiting_signature' || contractBlock.signature">
              <p class="text-xs text-highlighted">
                {{ t('inbox.context.awaitingSignature', {
                  when: contractBlock.signature?.sent_at
                    ? formatRelativeActivity(contractBlock.signature.sent_at)
                    : t('common.emptyValue')
                }) }}
              </p>
              <UBadge
                :label="t('contracts.status.awaiting_signature')"
                color="warning"
                variant="subtle"
                size="xs"
              />
            </template>
            <template v-else-if="contractBlock.balance">
              <div class="flex items-center justify-between text-xs">
                <span class="text-dimmed">{{ t('inbox.context.balanceOwed') }}</span>
                <span
                  class="font-medium"
                  :class="Number(contractBlock.balance.overdue) > 0 ? 'text-error' : 'text-highlighted'"
                >
                  {{ formatMoney(contractBlock.balance.owed, contractBlock.balance.currency) }}
                </span>
              </div>
              <div
                v-if="Number(contractBlock.balance.overdue) > 0"
                class="flex items-center justify-between text-xs"
              >
                <span class="text-dimmed">{{ t('inbox.context.balanceOverdue') }}</span>
                <span class="font-medium text-error">
                  {{ formatMoney(contractBlock.balance.overdue, contractBlock.balance.currency) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <UBadge
                  :label="t(`inbox.context.autopay.${contractBlock.autopay}`)"
                  :color="autopayColor(contractBlock.autopay)"
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  v-if="contractBlock.delinquency"
                  :label="t('inbox.context.delinquencyChip', {
                    days: contractBlock.delinquency.days,
                    stage: contractBlock.delinquency.stage_label
                  })"
                  color="error"
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  v-if="contractBlock.access?.suspended"
                  :label="t('inbox.context.accessSuspended', {
                    days: contractBlock.access.day_count ?? 0
                  })"
                  color="error"
                  variant="subtle"
                  size="xs"
                  icon="i-lucide-lock"
                />
              </div>
            </template>

            <NuxtLink
              :to="`/leasing/contracts/${contractBlock.id}`"
              class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {{ t('inbox.context.viewContract') }}
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3"
              />
            </NuxtLink>
          </div>
        </section>

        <!-- Pipeline -->
        <section
          v-if="pipeline?.open_deal"
          class="flex flex-col gap-2 border-b border-default p-4"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
            {{ t('inbox.context.pipelineTitle') }}
          </p>

          <div class="flex flex-wrap items-center gap-1.5">
            <UBadge
              :label="t(`dealStatus.${pipeline.open_deal.stage}`)"
              color="primary"
              variant="subtle"
              size="sm"
            />
            <span
              v-if="pipeline.open_deal.move_in"
              class="text-xs text-dimmed"
            >{{ t('inbox.context.moveIn', { date: formatDate(pipeline.open_deal.move_in) }) }}</span>
          </div>

          <p class="truncate text-sm text-highlighted">
            {{ pipeline.open_deal.title }}
          </p>

          <UBadge
            v-if="pipeline.lead_enrolment"
            color="info"
            variant="subtle"
            size="xs"
            class="w-fit"
            :label="t('inbox.context.enrolmentChip', {
              playbook: pipeline.lead_enrolment.playbook ?? t('inbox.context.enrolmentFallback'),
              step: pipeline.lead_enrolment.step_x_of_y
            })"
          />

          <NuxtLink
            :to="`/leasing/deals/${pipeline.open_deal.id}`"
            class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {{ t('inbox.context.viewDeal') }}
            <UIcon
              name="i-lucide-arrow-right"
              class="size-3"
            />
          </NuxtLink>
        </section>

        <!-- Recent -->
        <section
          v-if="recent.length > 0"
          class="flex flex-col gap-2 p-4"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
            {{ t('inbox.context.recentTitle') }}
          </p>

          <div
            v-for="(item, index) in recent"
            :key="index"
            class="flex items-start gap-2 text-xs"
          >
            <UIcon
              :name="iconFor(item.type)"
              class="mt-0.5 size-3.5 shrink-0 text-dimmed"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-highlighted">
                {{ item.summary || t('inbox.context.noSummary') }}
              </p>
              <p
                v-if="item.at"
                class="text-dimmed"
              >
                {{ formatRelativeActivity(item.at) }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <!-- Sticky quick actions -->
      <div class="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-default p-2.5">
        <UButton
          :label="t('inbox.quickActions.requestPayment.label')"
          icon="i-lucide-credit-card"
          color="neutral"
          variant="outline"
          size="xs"
          :loading="paymentFlowRef?.loading ?? false"
          :disabled="!contact?.id || activeContracts.length === 0"
          @click="onRequestPayment"
        />
        <UButton
          :label="t('inbox.quickActions.sendOffer.label')"
          icon="i-lucide-send"
          color="neutral"
          variant="outline"
          size="xs"
          :disabled="!contact?.id"
          @click="onSendOffer"
        />
        <UButton
          :label="t('inbox.quickActions.addTask.label')"
          icon="i-lucide-square-check"
          color="neutral"
          variant="outline"
          size="xs"
          :disabled="!contact?.id"
          @click="addTaskOpen = true"
        />
        <UTooltip :text="t('inbox.quickActions.sendContract.tooltip')">
          <UButton
            :label="t('inbox.quickActions.sendContract.label')"
            icon="i-lucide-file-signature"
            color="neutral"
            variant="outline"
            size="xs"
            disabled
          />
        </UTooltip>
      </div>

      <InboxRequestPaymentFlow
        ref="paymentFlowRef"
        :contracts="activeContracts"
        @created="onPaymentCreated"
      />

      <InboxAddTaskModal
        v-if="contact?.id"
        v-model:open="addTaskOpen"
        :contact-id="contact.id"
        @saved="onTaskSaved"
      />
    </template>
  </div>
</template>
