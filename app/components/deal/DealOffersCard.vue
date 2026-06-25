<script setup lang="ts">
import { offerStatusColor } from '~/composables/useOffersList'
import type { ApiOffer, ApiOfferOption } from '~/types/offer'

const props = defineProps<{
  dealId: number
  contactId?: number
  offers?: Array<ApiOffer>
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const showOfferForm = ref(false)

function openForm() {
  showOfferForm.value = true
}

function onOfferSaved() {
  emit('saved')
  toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
}

function sortedOptions(options?: Array<ApiOfferOption>) {
  return [...(options ?? [])].sort((a, b) => a.display_order - b.display_order)
}

function formatPrice(price: { amount: string; currency: string; billing_period: string }) {
  const sym = price.currency === 'GBP' ? '£' : price.currency === 'EUR' ? '€' : price.currency === 'USD' ? '$' : price.currency
  return `${sym}${price.amount} / ${price.billing_period}`
}

defineExpose({ openForm })
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-dimmed">
          Offers
          <span
            v-if="offers?.length"
            class="ms-1 tabular-nums"
          >
            ({{ offers.length }})
          </span>
        </h2>
        <UButton
          icon="i-lucide-plus"
          label="New offer"
          color="primary"
          size="sm"
          @click="openForm"
        />
      </div>
    </template>
    <div
      v-if="!offers?.length"
      class="py-6 text-center text-sm text-dimmed"
    >
      No offers yet. Create the first one.
    </div>
    <ul
      v-else
      class="divide-y divide-default"
    >
      <li
        v-for="offer in offers"
        :key="offer.id"
        class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="font-medium text-highlighted">
              Offer #{{ offer.id }}
            </p>
            <p class="mt-1 text-xs text-dimmed">
              Expires {{ offer.expires_at }}
            </p>
          </div>
          <UBadge
            :label="$t(`offerStatus.${offer.status}`)"
            :color="offerStatusColor(offer.status)"
            variant="subtle"
            size="sm"
          />
        </div>
        <div
          v-if="offer.options?.length"
          class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div
            v-for="option in sortedOptions(offer.options)"
            :key="option.id"
            class="flex flex-col gap-2 rounded-lg border border-default p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm font-medium text-highlighted">
                {{ option.label }}
              </p>
              <UBadge
                v-if="option.selected_at"
                label="Selected"
                color="success"
                variant="subtle"
                size="sm"
              />
            </div>
            <p
              v-if="option.description"
              class="text-xs text-dimmed"
            >
              {{ option.description }}
            </p>
            <div
              v-if="option.unit_class_rate"
              class="flex flex-col gap-1 text-xs text-dimmed"
            >
              <p v-if="option.unit_class_rate.site?.name">
                {{ option.unit_class_rate.site.name }}
              </p>
              <p v-if="option.unit_class_rate.unit_class?.label">
                {{ option.unit_class_rate.unit_class.label }}
              </p>
              <p
                v-if="option.unit_class_rate.price"
                class="font-medium text-highlighted"
              >
                {{ formatPrice(option.unit_class_rate.price) }}
              </p>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </UCard>

  <LeasingOfferFormSlideover
    v-model:open="showOfferForm"
    :initial-deal-id="dealId"
    :initial-contact-id="contactId"
    @saved="onOfferSaved"
  />
</template>
