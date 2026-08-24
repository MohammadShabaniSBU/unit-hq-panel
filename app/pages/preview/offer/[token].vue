<script setup lang="ts">
import { formatCurrencyAmount } from '~/composables/useUnitClassPriceMatrix'
import OfferExpiryCountdown from '~/components/offers/OfferExpiryCountdown.vue'
import type { ApiOfferOption } from '~/types/offer'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { formatDate } = useOrgDateFormat()

const token = computed(() => String(route.params.token))

const {
  offer,
  pending,
  error,
  selectingOptionId,
  fetchOfferByToken,
  selectOption
} = useOfferPreview()

onMounted(() => {
  void fetchOfferByToken(token.value)
})

const visualizerOpen = ref(false)

const { parts: countdown } = useCountdown(() => offer.value?.expires_at)

const isExpired = computed(() => {
  if (!offer.value) return false
  return countdown.value.expired
})

const isAccepted = computed(() => offer.value?.status === 'accepted')

const selectedOption = computed(() =>
  offer.value?.options?.find(option => option.selected_at) ?? null
)

const sortedOptions = computed(() =>
  [...(offer.value?.options ?? [])].sort((a, b) => a.display_order - b.display_order)
)

const isNotFound = computed(() => {
  if (pending.value || offer.value) return false
  if (!error.value) return false
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404
})

function priceAmount(option: ApiOfferOption): string {
  const price = option.unit_class_rate?.price
  if (!price) return '—'
  return formatCurrencyAmount(price.amount, price.currency)
}

function pricePeriod(option: ApiOfferOption): string {
  return option.unit_class_rate?.price?.billing_period ?? ''
}

function optionSiteName(option: ApiOfferOption): string | null {
  return option.unit_class_rate?.site?.name ?? null
}

function optionUnitClass(option: ApiOfferOption): string | null {
  return option.unit_class_rate?.unit_class?.label ?? null
}

function canSelectOption(option: ApiOfferOption): boolean {
  return !isExpired.value && !isAccepted.value && !option.selected_at
}

function firstDiscountedAmount(option: ApiOfferOption): string | null {
  return option.discount_resolution?.discount_schedule?.segments?.[0]?.amount ?? null
}

function thereafterDiscountedAmount(option: ApiOfferOption): string | null {
  const segments = option.discount_resolution?.discount_schedule?.segments
  if (!segments?.length) return null
  return segments[segments.length - 1]?.amount ?? null
}

function scheduleSummary(option: ApiOfferOption): string | null {
  const segments = option.discount_resolution?.discount_schedule?.segments
  if (!segments?.length || option.discount_resolution?.noop) return null

  const currency = option.unit_class_rate?.price?.currency ?? 'EUR'
  return segments.map((segment) => {
    const amount = formatCurrencyAmount(segment.amount, currency)
    if (!segment.to) {
      return t('discounts.scheduleThereafter', { amount })
    }
    if (segment.amount === '0.00') {
      return t('discounts.scheduleFreeUntil', { date: formatDate(segment.to) })
    }
    return t('discounts.scheduleAmountUntil', { amount, date: formatDate(segment.to) })
  }).join(' · ')
}

async function onSelectOption(option: ApiOfferOption) {
  if (!canSelectOption(option)) return

  try {
    await selectOption(option.id)
  } catch {
    toast.add({
      title: t('pages.offerPreview.selectError'),
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="flex min-h-svh">
    <!-- Left / main panel -->
    <div
      class="flex flex-col transition-all duration-500 ease-in-out"
      :class="visualizerOpen
        ? 'w-1/2 px-8 py-12'
        : 'mx-auto w-full max-w-2xl px-4 py-12 sm:px-8'"
    >
      <!-- Loading -->
      <div
        v-if="pending"
        class="flex flex-1 items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-primary"
        />
      </div>

      <!-- Not found -->
      <div
        v-else-if="isNotFound"
        class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
      >
        <UIcon
          name="i-lucide-file-x"
          class="size-12 text-dimmed"
        />
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t('pages.offerPreview.notFound') }}
        </h1>
        <p class="max-w-sm text-sm text-muted">
          {{ $t('pages.offerPreview.notFoundDescription') }}
        </p>
      </div>

      <!-- Generic error -->
      <div
        v-else-if="error && !offer"
        class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
      >
        <UIcon
          name="i-lucide-alert-circle"
          class="size-12 text-error"
        />
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t('pages.offerPreview.loadError') }}
        </h1>
      </div>

      <template v-else-if="offer">
        <!-- Accepted state -->
        <div
          v-if="isAccepted"
          class="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center"
        >
          <div class="flex size-20 items-center justify-center rounded-full bg-success/10">
            <UIcon
              name="i-lucide-check"
              class="size-10 text-success"
            />
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-bold text-highlighted">
              {{ $t('pages.offerPreview.accepted') }}
            </h1>
            <p class="max-w-md text-base text-muted">
              {{ $t('pages.offerPreview.acceptedDescription') }}
            </p>
          </div>

          <div
            v-if="selectedOption"
            class="mt-4 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-dimmed">
              {{ $t('pages.offerPreview.yourSelection') }}
            </p>
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 space-y-1">
                <h3 class="text-xl font-bold text-highlighted">
                  {{ selectedOption.label }}
                </h3>
                <p
                  v-if="selectedOption.description"
                  class="text-sm text-muted"
                >
                  {{ selectedOption.description }}
                </p>
                <p
                  v-if="optionSiteName(selectedOption)"
                  class="flex items-center gap-1 text-sm text-muted"
                >
                  <UIcon
                    name="i-lucide-map-pin"
                    class="size-3.5 shrink-0"
                  />
                  {{ optionSiteName(selectedOption) }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <span class="text-2xl font-bold text-primary">{{ priceAmount(selectedOption) }}</span>
                <span
                  v-if="pricePeriod(selectedOption)"
                  class="block text-xs text-muted"
                >/ {{ pricePeriod(selectedOption) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Active offer -->
        <div
          v-else
          class="flex flex-col"
        >
          <header class="mb-6 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-widest text-primary">
              {{ $t('pages.offerPreview.eyebrow') }}
            </p>
            <h1 class="text-3xl font-bold text-highlighted sm:text-4xl">
              {{ $t('pages.offerPreview.heading') }}
            </h1>
            <p class="max-w-lg text-base text-muted">
              {{
                offer.contact?.name
                  ? $t('pages.offerPreview.greeting', { name: offer.contact.name })
                  : $t('pages.offerPreview.greetingAnonymous')
              }}
            </p>
          </header>

          <UAlert
            v-if="isExpired"
            color="warning"
            icon="i-lucide-clock"
            class="mb-8"
            :title="$t('pages.offerPreview.expired')"
            :description="$t('pages.offerPreview.expiredDescription')"
          />
          <OfferExpiryCountdown
            v-else
            class="mb-8"
            :expires-at="offer.expires_at"
            :parts="countdown"
          />

          <div
            v-if="offer.deal?.expected_move_in"
            class="mb-6 flex items-center gap-2 text-sm text-muted"
          >
            <UIcon
              name="i-lucide-calendar"
              class="size-4 shrink-0"
            />
            <span>{{ $t('pages.offerPreview.moveIn') }}: {{ formatDate(offer.deal.expected_move_in) }}</span>
          </div>

          <div class="flex flex-col gap-3">
            <div
              v-for="option in sortedOptions"
              :key="option.id"
              class="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 dark:border-neutral-700 dark:bg-neutral-800"
              :class="option.selected_at ? 'ring-2 ring-primary' : ''"
            >
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <span
                  v-if="optionUnitClass(option)"
                  class="hidden shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted sm:inline-block dark:bg-neutral-700"
                >
                  {{ optionUnitClass(option) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-highlighted">
                    {{ option.label }}
                  </p>
                  <p
                    v-if="optionSiteName(option)"
                    class="flex items-center gap-1 truncate text-sm text-muted"
                  >
                    <UIcon
                      name="i-lucide-map-pin"
                      class="size-3.5 shrink-0"
                    />
                    {{ optionSiteName(option) }}
                  </p>
                  <p
                    v-if="option.promo_line"
                    class="mt-1 text-sm font-medium text-primary"
                  >
                    {{ option.promo_line }}
                  </p>
                  <p
                    v-if="scheduleSummary(option)"
                    class="mt-0.5 text-xs text-muted"
                  >
                    {{ scheduleSummary(option) }}
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                <div class="text-left sm:text-right">
                  <template v-if="option.discount && firstDiscountedAmount(option) && firstDiscountedAmount(option) !== option.unit_class_rate?.price?.amount">
                    <span class="mr-1 text-sm text-muted line-through">{{ priceAmount(option) }}</span>
                    <span class="text-lg font-bold text-primary">
                      {{ formatCurrencyAmount(firstDiscountedAmount(option)!, option.unit_class_rate?.price?.currency ?? 'EUR') }}
                    </span>
                    <span
                      v-if="thereafterDiscountedAmount(option) && thereafterDiscountedAmount(option) !== firstDiscountedAmount(option)"
                      class="mt-0.5 block text-xs text-muted"
                    >
                      {{ $t('discounts.promoThen', {
                        amount: formatCurrencyAmount(thereafterDiscountedAmount(option)!, option.unit_class_rate?.price?.currency ?? 'EUR'),
                        period: pricePeriod(option)
                      }) }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="text-lg font-bold text-primary">{{ priceAmount(option) }}</span>
                    <span
                      v-if="pricePeriod(option)"
                      class="ml-1 text-sm text-muted"
                    >/ {{ pricePeriod(option) }}</span>
                  </template>
                </div>

                <div class="flex items-center gap-2">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-box"
                    :label="$t('pages.offerPreview.visualize')"
                    @click="visualizerOpen = true"
                  />

                  <UBadge
                    v-if="option.selected_at"
                    color="primary"
                    variant="subtle"
                    :label="$t('pages.offerPreview.selected')"
                  />
                  <UButton
                    v-else-if="canSelectOption(option)"
                    color="neutral"
                    size="sm"
                    class="shrink-0"
                    :label="selectingOptionId === option.id ? $t('pages.offerPreview.selecting') : $t('pages.offerPreview.selectOption')"
                    :loading="selectingOptionId === option.id"
                    :disabled="selectingOptionId !== null"
                    @click="onSelectOption(option)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Right / visualizer panel — fixed so it always fills exactly half the viewport -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-500 ease-in-out"
      enter-from-class="opacity-0 translate-x-8"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-[opacity,transform] duration-500 ease-in-out"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-8"
    >
      <div
        v-if="visualizerOpen"
        class="fixed right-0 top-0 flex h-screen w-1/2 flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
          <span class="text-sm font-medium text-highlighted">{{ $t('pages.offerPreview.visualizerTitle') }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="$t('pages.offerPreview.closeVisualizer')"
            @click="visualizerOpen = false"
          />
        </div>
        <iframe
          src="https://3d-placement.netlify.app/"
          title="3D storage visualizer"
          class="w-full flex-1 border-0"
          allow="fullscreen"
        />
      </div>
    </Transition>
  </div>
</template>
