<script setup lang="ts">
import { formatCurrencyAmount } from '~/composables/useUnitClassPriceMatrix'
import type { ApiOfferOption } from '~/types/offer'

const props = defineProps<{
  option: ApiOfferOption
  picked: boolean
  mapActive: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  select: []
  map: []
  visualize: []
}>()

function onCardSelect() {
  if (!props.disabled) emit('select')
}

const { t } = useI18n()
const { formatDate } = useOrgDateFormat()

const currency = computed(() => offerOptionCurrency(props.option))
const size = computed(() => offerOptionSize(props.option))
const siteName = computed(() => offerOptionSiteName(props.option))
const unitClass = computed(() => offerOptionUnitClass(props.option))

const listPrice = computed(() => {
  const amount = offerOptionListAmount(props.option)
  return amount === null ? '—' : formatCurrencyAmount(amount, currency.value)
})

const firstAmount = computed(() => offerOptionFirstDiscountedAmount(props.option))
const thereafterAmount = computed(() => offerOptionThereafterDiscountedAmount(props.option))

const hasDiscountedPrice = computed(() =>
  !!props.option.discount
  && !!firstAmount.value
  && firstAmount.value !== offerOptionListAmount(props.option)
)

const scheduleSummary = computed((): string | null => {
  const segments = props.option.discount_resolution?.discount_schedule?.segments
  if (!segments?.length || props.option.discount_resolution?.noop) return null

  return segments.map((segment) => {
    const amount = formatCurrencyAmount(segment.amount, currency.value)
    if (!segment.to) {
      return t('discounts.scheduleThereafter', { amount })
    }
    if (segment.amount === '0.00') {
      return t('discounts.scheduleFreeUntil', { date: formatDate(segment.to) })
    }
    return t('discounts.scheduleAmountUntil', { amount, date: formatDate(segment.to) })
  }).join(' · ')
})
</script>

<template>
  <article
    class="overflow-hidden rounded-3xl border shadow-sm transition-colors"
    :class="[
      picked ? 'border-primary bg-default ring-1 ring-primary' : 'border-default bg-default',
      disabled ? '' : 'cursor-pointer',
      disabled || picked ? '' : 'hover:border-accented'
    ]"
    role="radio"
    :aria-checked="picked"
    :aria-disabled="disabled"
    :tabindex="disabled ? -1 : 0"
    @click="onCardSelect"
    @keydown.enter.self.prevent="onCardSelect"
    @keydown.space.self.prevent="onCardSelect"
  >
    <div class="flex flex-col gap-4 p-4 sm:p-5 @xl:flex-row @xl:items-center">
      <div class="flex min-w-0 flex-1 items-center gap-4">
        <div
          class="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-elevated text-highlighted sm:size-20"
          :aria-label="size ? $t('pages.offerPreview.sizeM2', { size }) : undefined"
        >
          <template v-if="size">
            <span class="text-lg font-bold leading-none sm:text-xl">{{ size }}</span>
            <span class="mt-0.5 text-xs font-semibold text-muted">m²</span>
          </template>
          <UIcon
            v-else
            name="i-lucide-box"
            class="size-6"
          />
        </div>

        <div class="min-w-0">
          <p class="break-words font-semibold text-highlighted">
            {{ option.label }}
          </p>
          <p
            v-if="unitClass"
            class="mt-0.5 text-sm text-muted"
          >
            {{ unitClass }}
          </p>
          <p
            v-if="siteName"
            class="mt-0.5 flex items-center gap-1 text-sm text-muted"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="size-3.5 shrink-0"
            />
            <span class="min-w-0 break-words">{{ siteName }}</span>
          </p>
          <p
            v-if="option.promo_line"
            class="mt-1 text-sm font-medium text-primary"
          >
            {{ option.promo_line }}
          </p>
          <p
            v-if="scheduleSummary"
            class="mt-0.5 text-xs text-muted"
          >
            {{ scheduleSummary }}
          </p>
        </div>
      </div>

      <div class="@xl:shrink-0 @xl:text-right">
        <template v-if="hasDiscountedPrice">
          <span class="mr-1 text-sm text-muted line-through">{{ listPrice }}</span>
          <span class="text-2xl font-bold text-primary">
            {{ formatCurrencyAmount(firstAmount!, currency) }}
          </span>
        </template>
        <span
          v-else
          class="text-2xl font-bold text-primary"
        >{{ listPrice }}</span>
        <p class="text-xs text-muted">
          {{ $t('pages.offerPreview.perMonth') }}
        </p>
        <p
          v-if="hasDiscountedPrice && thereafterAmount && thereafterAmount !== firstAmount"
          class="mt-0.5 text-xs text-muted"
        >
          {{ $t('discounts.promoThen', { amount: formatCurrencyAmount(thereafterAmount, currency), period: '' }) }}
        </p>
      </div>
    </div>

    <div
      class="flex flex-wrap items-center gap-2 border-t border-default bg-muted px-4 py-3 sm:px-5"
    >
      <UButton
        color="neutral"
        :variant="mapActive ? 'subtle' : 'outline'"
        size="sm"
        icon="i-lucide-map-pin"
        :label="$t('pages.offerPreview.showOnMap')"
        @click.stop="emit('map')"
      />
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-box"
        :label="$t('pages.offerPreview.visualize')"
        @click.stop="emit('visualize')"
      />
      <p
        v-if="picked"
        class="ml-auto flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <UIcon
          name="i-lucide-check-circle-2"
          class="size-4 shrink-0"
        />
        {{ $t('pages.offerPreview.selected') }}
      </p>
    </div>
  </article>
</template>
