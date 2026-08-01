<script setup lang="ts">
import { loadStripe, type Stripe, type StripeElements, type StripeCardElement } from '@stripe/stripe-js'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t } = useI18n()

const clientSecret = computed(() => {
  const value = route.query.client_secret ?? route.query.cs
  return typeof value === 'string' ? value : null
})

const publishableKey = computed(() => {
  const value = route.query.publishable_key ?? route.query.pk
  return typeof value === 'string' ? value : null
})

const hasParams = computed(() => Boolean(clientSecret.value && publishableKey.value))

const stripe = ref<Stripe | null>(null)
const elements = ref<StripeElements | null>(null)
const cardElement = ref<StripeCardElement | null>(null)
const cardMount = ref<HTMLElement | null>(null)
const saving = ref(false)
const succeeded = ref(false)
const saveError = ref<string | null>(null)

async function mountCard() {
  if (!publishableKey.value || !cardMount.value || cardElement.value) return

  const instance = await loadStripe(publishableKey.value)
  if (!instance) {
    saveError.value = t('pages.saveCard.saveError')
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

async function onSave() {
  if (!stripe.value || !cardElement.value || !clientSecret.value) return

  saving.value = true
  saveError.value = null

  try {
    const result = await stripe.value.confirmCardSetup(clientSecret.value, {
      payment_method: { card: cardElement.value }
    })

    if (result.error) {
      saveError.value = result.error.message ?? t('pages.saveCard.saveError')
      return
    }

    succeeded.value = true
  } catch {
    saveError.value = t('pages.saveCard.saveError')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!hasParams.value) return
  await nextTick()
  await mountCard()
})

onBeforeUnmount(() => {
  cardElement.value?.destroy()
})
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-12 sm:px-8">
    <header class="mb-8 text-center">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('pages.saveCard.heading') }}
      </h1>
      <p class="mt-2 text-sm text-dimmed">
        {{ $t('pages.saveCard.description') }}
      </p>
    </header>

    <div
      v-if="!hasParams"
      class="rounded-xl border border-default px-4 py-6 text-center"
    >
      <h2 class="text-lg font-semibold text-highlighted">
        {{ $t('pages.saveCard.missingParams') }}
      </h2>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('pages.saveCard.missingParamsDescription') }}
      </p>
    </div>

    <div
      v-else-if="succeeded"
      class="rounded-xl border border-success/30 bg-success/5 px-4 py-6 text-center"
    >
      <h2 class="text-lg font-semibold text-highlighted">
        {{ $t('pages.saveCard.success') }}
      </h2>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('pages.saveCard.successDescription') }}
      </p>
    </div>

    <div
      v-else
      class="flex flex-col gap-4"
    >
      <div>
        <p class="mb-2 text-sm font-medium text-dimmed">
          {{ $t('pages.saveCard.cardLabel') }}
        </p>
        <div
          ref="cardMount"
          class="rounded-lg border border-default bg-white px-3 py-3"
        />
      </div>

      <p
        v-if="saveError"
        class="text-sm text-error"
      >
        {{ saveError }}
      </p>

      <UButton
        color="primary"
        size="lg"
        block
        :label="saving ? $t('pages.saveCard.saving') : $t('pages.saveCard.save')"
        :loading="saving"
        :disabled="saving"
        @click="onSave"
      />
    </div>
  </div>
</template>
