<script setup lang="ts">
import { formatMoney } from '~/composables/useMoney'
import type { ApiPaymentMethod } from '~/types/stripe'

const props = defineProps<{
  contractId: number
  contactId: number
  currency: string
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { formatDateTime: formatOrgDateTime } = useOrgDateFormat()

const contractIdRef = computed(() => props.contractId)
const contactIdRef = computed(() => props.contactId)

const {
  autopay,
  pending,
  submitting,
  actionError,
  update,
  retry
} = useContractAutopay(contractIdRef)

const {
  methods,
  pending: methodsPending,
  refresh: refreshMethods,
  setup
} = useContactPaymentMethods(contactIdRef)

const enabled = ref(false)
const selectedMethodId = ref<number | null>(null)

watch(autopay, (value) => {
  if (!value) return
  enabled.value = value.enabled
  selectedMethodId.value = value.payment_method_id
}, { immediate: true })

const cardOptions = computed(() =>
  methods.value
    .filter((m: ApiPaymentMethod) => m.type === 'stripe_card' && !m.archived_at)
    .map((m: ApiPaymentMethod) => ({
      label: m.display_label + (m.is_default ? ` (${t('contacts.paymentMethods.defaultBadge')})` : ''),
      value: m.id
    }))
)

const failedAttempt = computed(() =>
  autopay.value?.last_attempt?.status === 'failed' ? autopay.value.last_attempt : null
)

async function onSave() {
  const ok = await update({
    enabled: enabled.value,
    payment_method_id: selectedMethodId.value
  })
  if (ok) {
    toast.add({ title: t('billing.autopay.saveSuccess'), color: 'success' })
    emit('refreshed')
  } else if (actionError.value) {
    toast.add({ title: actionError.value, color: 'error' })
  }
}

async function onRetry() {
  const ok = await retry()
  if (ok) {
    toast.add({ title: t('billing.autopay.retrySuccess'), color: 'success' })
    emit('refreshed')
  } else if (actionError.value) {
    toast.add({ title: actionError.value, color: 'error' })
  }
}

async function onAddCard() {
  const result = await setup(props.contractId)
  if (!result?.client_secret || !result.publishable_key) {
    toast.add({ title: t('contacts.paymentMethods.setupError'), color: 'error' })
    return
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({
    client_secret: result.client_secret,
    publishable_key: result.publishable_key
  })
  const link = `${origin}/save-card?${params.toString()}`

  try {
    await navigator.clipboard.writeText(link)
    toast.add({ title: t('contacts.paymentMethods.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('contacts.paymentMethods.linkReady'), color: 'success' })
  }

  await refreshMethods()
}

function formatAttemptDate(value: string | null | undefined): string {
  return formatOrgDateTime(value, { empty: t('common.emptyValue') })
}
</script>

<template>
  <div class="mt-6 space-y-4 border-t border-default pt-4">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-medium text-highlighted">
        {{ $t('billing.autopay.title') }}
      </h3>
      <UButton
        size="xs"
        variant="ghost"
        :label="$t('billing.autopay.addCard')"
        @click="onAddCard"
      />
    </div>

    <div
      v-if="pending || methodsPending"
      class="text-sm text-dimmed"
    >
      {{ $t('contacts.paymentMethods.loading') }}
    </div>

    <template v-else>
      <UAlert
        v-if="failedAttempt"
        color="warning"
        variant="subtle"
        :title="$t('billing.autopay.failedBanner', {
          reason: failedAttempt.failure_message
            || failedAttempt.decline_code
            || failedAttempt.failure_code
            || $t('billing.autopay.statuses.failed')
        })"
      >
        <template #actions>
          <UButton
            size="xs"
            color="warning"
            :label="$t('billing.autopay.retry')"
            :loading="submitting"
            @click="onRetry"
          />
        </template>
      </UAlert>

      <UFormField :label="$t('billing.autopay.toggle')">
        <USwitch v-model="enabled" />
      </UFormField>

      <UFormField :label="$t('billing.autopay.method')">
        <USelect
          v-model="selectedMethodId"
          :items="cardOptions"
          value-key="value"
          :placeholder="$t('billing.autopay.methodPlaceholder')"
          class="w-full"
        />
        <p
          v-if="!cardOptions.length"
          class="mt-1 text-xs text-dimmed"
        >
          {{ $t('billing.autopay.noCards') }}
        </p>
      </UFormField>

      <dl
        v-if="autopay"
        class="grid gap-2 text-sm sm:grid-cols-2"
      >
        <div>
          <dt class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('billing.autopay.lastAttempt') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            <template v-if="autopay.last_attempt">
              {{ $t(`billing.autopay.statuses.${autopay.last_attempt.status}`) }}
              · {{ formatAttemptDate(autopay.last_attempt.attempted_at) }}
            </template>
            <template v-else>
              {{ $t('common.emptyValue') }}
            </template>
          </dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('billing.autopay.nextCollection') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            <template v-if="autopay.next_collection?.date">
              {{ autopay.next_collection.date }}
              <span
                v-if="autopay.next_collection.amount"
                class="block text-dimmed"
              >
                {{ formatMoney(autopay.next_collection.amount, autopay.next_collection.currency || currency, locale) }}
              </span>
            </template>
            <template v-else>
              {{ $t('common.emptyValue') }}
            </template>
          </dd>
        </div>
      </dl>

      <UButton
        size="sm"
        :label="submitting ? $t('billing.autopay.saving') : $t('billing.autopay.save')"
        :loading="submitting"
        @click="onSave"
      />
    </template>
  </div>
</template>
