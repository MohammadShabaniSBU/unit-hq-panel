<script setup lang="ts">
import { formatCurrencyAmount } from '~/composables/useUnitClassPriceMatrix'
import type { ApiOfferOption } from '~/types/offer'

const props = defineProps<{
  option: ApiOfferOption | null
  /** Current default deposit (estimate) from the public offer payload. */
  depositAmount?: string | null
  moveInDate?: string | null
  expiresAtLabel: string
  loading: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  continue: []
}>()

function toCents(value: string | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

const currency = computed(() => props.option ? offerOptionCurrency(props.option) : 'EUR')

const rentCents = computed(() =>
  props.option ? toCents(offerOptionFirstPeriodAmount(props.option)) : 0
)
const depositCents = computed(() => toCents(props.depositAmount))
const dueCents = computed(() => rentCents.value + depositCents.value)

function money(cents: number): string {
  return formatCurrencyAmount((cents / 100).toFixed(2), currency.value)
}
</script>

<template>
  <aside class="rounded-3xl border border-default bg-default p-5 shadow-sm sm:p-6">
    <p class="text-xs font-semibold uppercase tracking-widest text-highlighted">
      {{ $t('pages.offerPreview.selectionTitle') }}
    </p>

    <template v-if="option">
      <div class="mt-4">
        <h3 class="break-words text-lg font-bold text-highlighted">
          {{ option.label }}
        </h3>
        <p
          v-if="offerOptionSiteName(option)"
          class="mt-0.5 flex items-center gap-1 text-sm text-muted"
        >
          <UIcon
            name="i-lucide-map-pin"
            class="size-3.5 shrink-0"
          />
          <span class="min-w-0 break-words">{{ offerOptionSiteName(option) }}</span>
        </p>
      </div>

      <p class="mt-4 text-3xl font-bold text-primary">
        {{ money(rentCents) }}
        <span class="text-sm font-normal text-muted">/ {{ $t('pages.offerPreview.perMonth') }}</span>
      </p>

      <dl class="mt-5 space-y-2 text-sm">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-muted">
            {{ $t('pages.offerPreview.monthlyRent') }}
          </dt>
          <dd class="font-medium text-highlighted">
            {{ money(rentCents) }}
          </dd>
        </div>
        <div
          v-if="depositCents > 0"
          class="flex items-center justify-between gap-3"
        >
          <dt class="text-muted">
            {{ $t('pages.offerPreview.deposit') }}
          </dt>
          <dd class="font-medium text-highlighted">
            {{ money(depositCents) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-default pt-3">
          <dt class="font-semibold text-highlighted">
            {{ $t('pages.offerPreview.dueAtMoveIn') }}
          </dt>
          <dd class="text-lg font-bold text-highlighted">
            {{ money(dueCents) }}
          </dd>
        </div>
      </dl>
      <p class="mt-1 text-xs text-dimmed">
        {{ $t('pages.offerPreview.estimateNote') }}
      </p>
    </template>

    <p
      v-else
      class="mt-4 text-sm text-muted"
    >
      {{ $t('pages.offerPreview.nothingSelected') }}
    </p>

    <div
      v-if="moveInDate"
      class="mt-5"
    >
      <p class="mb-1.5 text-xs font-medium text-muted">
        {{ $t('pages.offerPreview.moveInDate') }}
      </p>
      <div class="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5 text-sm text-highlighted">
        <UIcon
          name="i-lucide-calendar"
          class="size-4 shrink-0 text-muted"
        />
        {{ moveInDate }}
      </div>
    </div>

    <UButton
      color="primary"
      size="xl"
      block
      class="mt-5 rounded-2xl"
      trailing-icon="i-lucide-arrow-right"
      :label="$t('pages.offerPreview.continueToReservation')"
      :loading="loading"
      :disabled="disabled || !option"
      @click="emit('continue')"
    />

    <p class="mt-3 text-center text-xs text-muted">
      {{ $t('pages.offerPreview.validUntil', { datetime: expiresAtLabel }) }}
    </p>
  </aside>
</template>
