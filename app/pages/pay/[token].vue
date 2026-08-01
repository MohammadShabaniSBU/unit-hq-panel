<script setup lang="ts">
import { loadStripe, type Stripe, type StripeElements, type StripeCardElement } from '@stripe/stripe-js'
import { formatMoney } from '~/composables/useMoney'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t, locale } = useI18n()

const token = computed(() => String(route.params.token))

const {
  payment,
  pending,
  error,
  intentPending,
  fetchByToken,
  createIntent
} = usePublicPayment()

const stripe = ref<Stripe | null>(null)
const elements = ref<StripeElements | null>(null)
const cardElement = ref<StripeCardElement | null>(null)
const cardMount = ref<HTMLElement | null>(null)
const paying = ref(false)
const confirming = ref(false)
const payError = ref<string | null>(null)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

const isNotFound = computed(() => {
  if (pending.value || payment.value) return false
  if (!error.value) return false
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404
})

const isTerminalPaid = computed(() => payment.value?.status === 'paid')
const isCancelled = computed(() => payment.value?.status === 'cancelled')
const isExpired = computed(() => Boolean(payment.value?.expired))
const canPay = computed(() =>
  payment.value != null
  && payment.value.status === 'pending'
  && !payment.value.expired
  && !payment.value.amount_mismatch
  && !confirming.value
  && !isTerminalPaid.value
)

function formatAmount(amount: string, currency: string) {
  return formatMoney(amount, currency, locale.value)
}

function lineLabel(chargeType: string | null): string {
  if (!chargeType) return t('billing.paymentRequests.chargeTypes.other')
  return t(`billing.paymentRequests.chargeTypes.${chargeType}`, chargeType)
}

async function mountCard() {
  if (!payment.value?.publishable_key || !cardMount.value) return
  if (cardElement.value) return

  const instance = await loadStripe(payment.value.publishable_key)
  if (!instance) {
    payError.value = t('pages.pay.stripeMissing')
    return
  }

  stripe.value = instance
  elements.value = instance.elements()
  const card = elements.value.create('card', {
    style: {
      base: {
        'fontSize': '16px',
        'color': '#1c1917',
        '::placeholder': { color: '#a8a29e' }
      }
    }
  })
  card.mount(cardMount.value)
  cardElement.value = card
}

function stopPolling() {
  if (pollTimer.value != null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPolling() {
  stopPolling()
  confirming.value = true
  let attempts = 0
  pollTimer.value = setInterval(async () => {
    attempts += 1
    await fetchByToken(token.value)
    if (payment.value?.status === 'paid' || attempts >= 40) {
      stopPolling()
      if (payment.value?.status === 'paid') {
        confirming.value = false
      }
    }
  }, 1500)
}

async function onPay() {
  if (!canPay.value || !stripe.value || !cardElement.value) return

  paying.value = true
  payError.value = null

  try {
    const intent = await createIntent(token.value)
    if (!intent.client_secret) {
      payError.value = t('pages.pay.payError')
      return
    }

    const result = await stripe.value.confirmCardPayment(intent.client_secret, {
      payment_method: { card: cardElement.value }
    })

    if (result.error) {
      payError.value = result.error.message ?? t('pages.pay.payError')
      return
    }

    startPolling()
  } catch (e: unknown) {
    const fetchError = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    payError.value = firstFieldError ?? fetchError.data?.message ?? t('pages.pay.payError')
  } finally {
    paying.value = false
  }
}

onMounted(async () => {
  await fetchByToken(token.value)
  await nextTick()
  if (canPay.value) {
    await mountCard()
  }
})

watch(canPay, async (ok) => {
  if (ok) {
    await nextTick()
    await mountCard()
  }
})

onBeforeUnmount(() => {
  stopPolling()
  cardElement.value?.destroy()
})
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-12 sm:px-8">
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center text-sm text-dimmed"
    >
      {{ $t('pages.pay.title') }}…
    </div>

    <div
      v-else-if="isNotFound"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
    >
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('pages.pay.notFound') }}
      </h1>
      <p class="text-sm text-dimmed">
        {{ $t('pages.pay.notFoundDescription') }}
      </p>
    </div>

    <div
      v-else-if="error && !payment"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
    >
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('pages.pay.loadError') }}
      </h1>
    </div>

    <template v-else-if="payment">
      <header class="mb-8 text-center">
        <p
          v-if="payment.entity_name"
          class="text-sm font-medium uppercase tracking-wide text-dimmed"
        >
          {{ payment.entity_name }}
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-highlighted">
          <template v-if="payment.contact_first_name">
            {{ $t('pages.pay.greeting', { name: payment.contact_first_name }) }}
          </template>
          <template v-else>
            {{ $t('pages.pay.greetingAnonymous') }}
          </template>
        </h1>
      </header>

      <div
        v-if="isTerminalPaid"
        class="rounded-xl border border-success/30 bg-success/5 px-4 py-6 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('pages.pay.paid') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.pay.paidDescription') }}
        </p>
      </div>

      <div
        v-else-if="isCancelled"
        class="rounded-xl border border-default px-4 py-6 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('pages.pay.cancelled') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.pay.cancelledDescription') }}
        </p>
      </div>

      <div
        v-else-if="isExpired"
        class="rounded-xl border border-warning/40 bg-warning/10 px-4 py-6 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('pages.pay.expired') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.pay.expiredDescription') }}
        </p>
      </div>

      <div
        v-else-if="confirming"
        class="rounded-xl border border-primary/30 bg-primary/5 px-4 py-6 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('pages.pay.confirming') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.pay.confirmingHint') }}
        </p>
      </div>

      <div
        v-else
        class="flex flex-col gap-6"
      >
        <div class="rounded-xl border border-default bg-default px-4 py-5 text-center shadow-sm">
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('pages.pay.amountDue') }}
          </p>
          <p class="mt-1 text-3xl font-semibold text-highlighted">
            {{ formatAmount(payment.amount, payment.currency) }}
          </p>
        </div>

        <div
          v-if="payment.amount_mismatch"
          class="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-highlighted"
        >
          {{ $t('pages.pay.mismatch') }}
        </div>

        <div>
          <h2 class="mb-2 text-sm font-medium text-dimmed">
            {{ $t('pages.pay.linesTitle') }}
          </h2>
          <ul class="divide-y divide-default rounded-lg border border-default">
            <li
              v-for="(line, index) in payment.lines"
              :key="index"
              class="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <div class="min-w-0">
                <p class="font-medium text-highlighted">
                  {{ lineLabel(line.charge_type) }}
                </p>
                <p class="text-xs text-dimmed">
                  <template v-if="line.period_start && line.period_end">
                    {{ $t('pages.pay.period', { start: line.period_start, end: line.period_end }) }}
                  </template>
                  <template v-else-if="line.due_date">
                    {{ $t('pages.pay.dueOn', { date: line.due_date }) }}
                  </template>
                </p>
              </div>
              <span class="shrink-0 font-medium text-highlighted">
                {{ formatAmount(line.open_amount, line.currency) }}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <p class="mb-2 text-sm font-medium text-dimmed">
            {{ $t('pages.pay.cardLabel') }}
          </p>
          <div
            ref="cardMount"
            class="rounded-lg border border-default bg-white px-3 py-3"
          />
        </div>

        <p
          v-if="payment.save_card_requested"
          class="text-sm text-dimmed"
        >
          {{ $t('pages.pay.saveCard') }}
        </p>

        <p
          v-if="payError"
          class="text-sm text-error"
        >
          {{ payError }}
        </p>

        <UButton
          color="primary"
          size="lg"
          block
          :label="paying || intentPending ? $t('pages.pay.paying') : $t('pages.pay.pay')"
          :loading="paying || intentPending"
          :disabled="!canPay || paying || intentPending"
          @click="onPay"
        />
      </div>
    </template>
  </div>
</template>
