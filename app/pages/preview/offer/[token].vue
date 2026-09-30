<script setup lang="ts">
import { formatCurrencyAmount } from '~/composables/useUnitClassPriceMatrix'
import OfferContactBanner from '~/components/offers/OfferContactBanner.vue'
import OfferExpiryCountdown from '~/components/offers/OfferExpiryCountdown.vue'
import OfferNextSteps from '~/components/offers/OfferNextSteps.vue'
import OfferOptionCard from '~/components/offers/OfferOptionCard.vue'
import OfferPageHeader from '~/components/offers/OfferPageHeader.vue'
import OfferSelectionSummary from '~/components/offers/OfferSelectionSummary.vue'
import type { ApiOfferOption } from '~/types/offer'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { formatDate, formatDateTime } = useOrgDateFormat()

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

const visualizerOption = ref<ApiOfferOption | null>(null)
const visualizerOpen = computed(() => visualizerOption.value !== null)
const mapOptionId = ref<number | null>(null)
const mapPanelOpen = computed(() => mapOptionId.value !== null)
const anyPanelOpen = computed(() => visualizerOpen.value || mapPanelOpen.value)

// Map and 3D visualizer both open as full-viewport overlays.
const fullPanelClass = [
  'fixed inset-0 z-40 flex h-dvh w-full flex-col bg-white shadow-2xl',
  'dark:bg-neutral-900'
].join(' ')

function openOptionMap(optionId: number) {
  visualizerOption.value = null
  mapOptionId.value = optionId
}

function closeMapPanel() {
  mapOptionId.value = null
}

function openVisualizer(option: ApiOfferOption) {
  mapOptionId.value = null
  visualizerOption.value = option
}

function visualizerPrice(option: ApiOfferOption): string | null {
  const raw = offerOptionFirstPeriodAmount(option)
  if (raw === null || raw === undefined || raw === '') return null
  const amount = Number(raw)
  if (!Number.isFinite(amount)) return null
  return String(amount)
}

const visualizerSrc = computed(() => {
  const option = visualizerOption.value
  const params = new URLSearchParams()
  if (option) {
    const size = offerOptionSize(option)
    const price = visualizerPrice(option)
    if (size) params.set('size', size)
    if (price) params.set('price', price)
  }
  const query = params.toString()
  return query
    ? `https://3d-placement.netlify.app/?${query}`
    : 'https://3d-placement.netlify.app/'
})

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

// Two-step select: cards only mark a local pick; the sidebar CTA commits it.
const pickedOptionId = ref<number | null>(null)

watch(sortedOptions, (options) => {
  if (!options.some(option => option.id === pickedOptionId.value)) {
    pickedOptionId.value = options[0]?.id ?? null
  }
}, { immediate: true })

const pickedOption = computed(() =>
  sortedOptions.value.find(option => option.id === pickedOptionId.value) ?? null
)

const isNotFound = computed(() => {
  if (pending.value || offer.value) return false
  if (!error.value) return false
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404
})

const contactName = computed(() => offer.value?.contact?.name?.trim() ?? '')
const firstName = computed(() => contactName.value.split(/\s+/)[0] ?? '')

const heroHeading = computed(() => {
  const count = sortedOptions.value.length
  return firstName.value
    ? t('pages.offerPreview.headlineNamed', { name: firstName.value }, count)
    : t('pages.offerPreview.headlineAnonymous', {}, count)
})

// Site contact details: prefer the picked option's site, fall back to any option's.
const contactSite = computed(() => {
  const withContact = (option: ApiOfferOption | null | undefined) => {
    const site = option?.unit_class_rate?.site
    return site && (site.contact_phone || site.contact_email) ? site : null
  }
  return withContact(pickedOption.value)
    ?? sortedOptions.value.map(withContact).find(Boolean)
    ?? null
})
const sitePhone = computed(() => contactSite.value?.contact_phone ?? null)
const siteEmail = computed(() => contactSite.value?.contact_email ?? null)

const expiresAtLabel = computed(() =>
  offer.value?.expires_at ? formatDateTime(offer.value.expires_at) : ''
)

const moveInLabel = computed(() =>
  offer.value?.deal?.expected_move_in ? formatDate(offer.value.deal.expected_move_in) : null
)

const footerText = computed(() => contactName.value
  ? t('pages.offerPreview.preparedFor', { name: contactName.value, datetime: expiresAtLabel.value })
  : t('pages.offerPreview.preparedForAnonymous', { datetime: expiresAtLabel.value })
)

function priceAmount(option: ApiOfferOption): string {
  const price = option.unit_class_rate?.price
  if (!price) return '—'
  return formatCurrencyAmount(price.amount, price.currency)
}

function canSelectOption(option: ApiOfferOption): boolean {
  return !isExpired.value && !isAccepted.value && !option.selected_at
}

async function onContinue() {
  const option = pickedOption.value
  if (!option || !canSelectOption(option)) return

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
  <div
    class="flex min-h-svh"
    :class="anyPanelOpen ? 'max-md:h-dvh max-md:overflow-hidden' : ''"
  >
    <!-- Left / main panel -->
    <div
      class="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10"
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

      <div
        v-else-if="offer"
        class="@container flex flex-1 flex-col gap-8"
      >
        <OfferPageHeader :phone="sitePhone" />

        <!-- Accepted state -->
        <div
          v-if="isAccepted"
          class="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center"
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
            class="mt-4 w-full max-w-md rounded-3xl border border-default bg-default p-6 text-left shadow-sm"
          >
            <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-dimmed">
              {{ $t('pages.offerPreview.yourSelection') }}
            </p>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 space-y-1">
                <h3 class="break-words text-xl font-bold text-highlighted">
                  {{ selectedOption.label }}
                </h3>
                <p
                  v-if="selectedOption.description"
                  class="text-sm text-muted"
                >
                  {{ selectedOption.description }}
                </p>
                <p
                  v-if="offerOptionSiteName(selectedOption)"
                  class="flex items-center gap-1 text-sm text-muted"
                >
                  <UIcon
                    name="i-lucide-map-pin"
                    class="size-3.5 shrink-0"
                  />
                  {{ offerOptionSiteName(selectedOption) }}
                </p>
              </div>
              <div class="shrink-0 text-left sm:text-right">
                <span class="text-2xl font-bold text-primary">{{ priceAmount(selectedOption) }}</span>
                <span class="block text-xs text-muted">{{ $t('pages.offerPreview.perMonth') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Active offer -->
        <template v-else>
          <section class="flex flex-col gap-6 @3xl:flex-row @3xl:items-end @3xl:justify-between">
            <div class="max-w-2xl space-y-3">
              <p class="text-xs font-semibold uppercase tracking-widest text-primary">
                {{ $t('pages.offerPreview.eyebrow') }}
              </p>
              <h1 class="text-3xl font-bold text-highlighted sm:text-4xl">
                {{ heroHeading }}
              </h1>
              <p class="text-base text-muted">
                {{ $t('pages.offerPreview.heroSubtext') }}
              </p>
            </div>

            <UAlert
              v-if="isExpired"
              color="warning"
              icon="i-lucide-clock"
              class="@3xl:w-96"
              :title="$t('pages.offerPreview.expired')"
              :description="$t('pages.offerPreview.expiredDescription')"
            />
            <OfferExpiryCountdown
              v-else
              class="@3xl:w-96 @3xl:shrink-0"
              :expires-at="offer.expires_at"
              :parts="countdown"
            />
          </section>

          <div class="grid items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div
              class="@container flex flex-col gap-4"
              role="radiogroup"
              :aria-label="$t('pages.offerPreview.optionsTitle')"
            >
              <OfferOptionCard
                v-for="option in sortedOptions"
                :key="option.id"
                :option="option"
                :picked="option.id === pickedOptionId"
                :map-active="mapOptionId === option.id"
                :disabled="!canSelectOption(option)"
                @select="pickedOptionId = option.id"
                @map="openOptionMap(option.id)"
                @visualize="openVisualizer(option)"
              />
            </div>

            <div class="@4xl:sticky @4xl:top-6">
              <OfferSelectionSummary
                :option="pickedOption"
                :deposit-amount="offer.deposit_amount"
                :move-in-date="moveInLabel"
                :expires-at-label="expiresAtLabel"
                :loading="selectingOptionId !== null"
                :disabled="isExpired || selectingOptionId !== null"
                @continue="onContinue"
              />
            </div>
          </div>

          <OfferNextSteps />
        </template>

        <OfferContactBanner
          :phone="sitePhone"
          :email="siteEmail"
        />

        <footer class="pb-2 text-center text-xs text-dimmed @2xl:text-left">
          {{ footerText }}
        </footer>
      </div>
    </div>

    <!-- Map — fixed so it covers the full viewport -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-500 ease-in-out"
      enter-from-class="opacity-0 translate-x-8"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-[opacity,transform] duration-500 ease-in-out"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-8"
    >
      <div
        v-if="mapPanelOpen"
        :class="fullPanelClass"
      >
        <div class="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
          <span class="min-w-0 truncate text-sm font-medium text-highlighted">{{ $t('pages.offerPreview.mapTitle') }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="$t('pages.offerPreview.closeMap')"
            @click="closeMapPanel"
          />
        </div>
        <div class="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          <LeasingOfferOptionMapViewer
            class="h-full"
            :option-id="mapOptionId"
            :token="token"
          />
        </div>
      </div>
    </Transition>

    <!-- Visualizer — fixed so it covers the full viewport -->
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
        :class="fullPanelClass"
      >
        <div class="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
          <span class="min-w-0 truncate text-sm font-medium text-highlighted">{{ $t('pages.offerPreview.visualizerTitle') }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="$t('pages.offerPreview.closeVisualizer')"
            @click="visualizerOption = null"
          />
        </div>
        <iframe
          :src="visualizerSrc"
          title="3D storage visualizer"
          class="w-full flex-1 border-0"
          allow="fullscreen"
        />
      </div>
    </Transition>
  </div>
</template>
