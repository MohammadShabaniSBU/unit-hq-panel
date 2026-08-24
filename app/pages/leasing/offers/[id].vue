<script setup lang="ts">
import { offerStatusColor } from '~/composables/useOffersList'
import type { ApiOffer, ApiOfferOption } from '~/types/offer'

type OfferTab = 'overview' | 'activity'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { formatDate, formatDateTime } = useOrgDateFormat()

const offerId = computed(() => String(route.params.id))

const {
  offer,
  pending,
  error,
  refresh
} = useOfferDetail(offerId.value)

const activeTab = ref<OfferTab>('overview')
const showOfferForm = ref(false)
const showNewOptionCard = ref(false)
const mapOptionId = ref<number | null>(null)
const showOptionMap = computed({
  get: () => mapOptionId.value !== null,
  set: (open: boolean) => {
    if (!open) {
      mapOptionId.value = null
    }
  }
})

const nextDisplayOrder = computed(() => offer.value?.options?.length ?? 0)

const contactName = computed(() => offer.value?.contact?.name ?? `Contact #${offer.value?.contact_id}`)
const dealName = computed(() => `Deal #${offer.value?.deal_id}`)

function onNativeSaved(updated: Record<string, unknown>) {
  if (!offer.value) {
    return
  }

  Object.assign(offer.value, updated as ApiOffer)
}

const tabs = computed<Array<{ key: OfferTab, label: string, count?: number }>>(() => [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' }
])

function sortedOptions(options?: Array<ApiOfferOption>) {
  return [...(options ?? [])].sort((a, b) => a.display_order - b.display_order)
}

function onOptionUpdated(updated: ApiOfferOption) {
  if (!offer.value?.options) return

  const index = offer.value.options.findIndex(option => option.id === updated.id)
  if (index === -1) return

  offer.value.options[index] = updated
}

function onOptionDeleted(optionId: number) {
  if (!offer.value?.options) return

  offer.value.options = offer.value.options.filter(option => option.id !== optionId)
}

function onOptionCreated(created: ApiOfferOption) {
  if (!offer.value) return

  if (!offer.value.options) {
    offer.value.options = [created]
  } else {
    offer.value.options.push(created)
  }

  showNewOptionCard.value = false
}

function onNewOptionCancel() {
  showNewOptionCard.value = false
}

function onOfferSaved() {
  refresh()
  toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
  showOfferForm.value = false
}
</script>

<template>
  <UContainer class="py-8">
    <div
      v-if="pending"
      class="flex items-center justify-center py-24"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error || !offer"
      class="rounded-xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <p class="text-sm text-error">
        Failed to load offer.
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <div
      v-else
      class="flex flex-col gap-6"
    >
      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <nav class="mb-3 flex items-center gap-1.5 text-sm text-dimmed">
            <NuxtLink
              to="/leasing/offers"
              class="hover:text-highlighted"
            >
              Offers
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <NuxtLink
              v-if="offer.deal_id"
              :to="`/leasing/deals/${offer.deal_id}`"
              class="hover:text-highlighted"
            >
              {{ dealName }}
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <span class="text-highlighted">Offer #{{ offer.id }}</span>
          </nav>

          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-highlighted">
              Offer #{{ offer.id }}
            </h1>
            <UBadge
              :label="$t(`offerStatus.${offer.status}`)"
              :color="offerStatusColor(offer.status)"
              variant="subtle"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
            <NuxtLink
              :to="`/leasing/contacts/${offer.contact_id}`"
              class="inline-flex items-center gap-1.5 hover:text-highlighted"
            >
              <UIcon
                name="i-lucide-user"
                class="size-3.5"
              />
              {{ contactName }}
            </NuxtLink>
            <span
              v-if="offer.expires_at"
              class="inline-flex items-center gap-1.5"
            >
              <UIcon
                name="i-lucide-calendar"
                class="size-3.5"
              />
              Expires {{ formatDateTime(offer.expires_at) }}
            </span>
            <span
              v-if="offer.sent_at"
              class="inline-flex items-center gap-1.5"
            >
              <UIcon
                name="i-lucide-send"
                class="size-3.5"
              />
              Sent {{ formatDateTime(offer.sent_at) }}
            </span>
          </div>
        </div>

        <UButton
          icon="i-lucide-pencil"
          label="Edit"
          color="primary"
          @click="showOfferForm = true"
        />
      </div>

      <!-- Tabs -->
      <div class="flex flex-wrap items-center gap-1 border-b border-default pb-3">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          color="neutral"
          :variant="activeTab === tab.key ? 'solid' : 'ghost'"
          size="sm"
          class="rounded-full"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            v-if="tab.count"
            class="ms-1 tabular-nums"
          >
            {{ tab.count }}
          </span>
        </UButton>
      </div>

      <!-- Overview tab -->
      <div v-show="activeTab === 'overview'">
        <div class="grid gap-4 xl:grid-cols-3">
          <!-- Main content -->
          <div class="flex flex-col gap-4 xl:col-span-2">
            <EntityOverviewCards
              v-if="offer"
              entity-type="offer"
              :entity="offer"
              @native-saved="onNativeSaved"
            />

            <!-- Offer options -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-medium text-dimmed">
                    Options
                    <span
                      v-if="offer.options?.length"
                      class="ms-1 tabular-nums"
                    >
                      ({{ offer.options.length }})
                    </span>
                  </h2>
                  <UButton
                    icon="i-lucide-plus"
                    :label="$t('forms.offer.addOption')"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    :disabled="showNewOptionCard"
                    @click="showNewOptionCard = true"
                  />
                </div>
              </template>

              <div
                v-if="!offer.options?.length && !showNewOptionCard"
                class="py-6 text-center text-sm text-dimmed"
              >
                No options yet.
              </div>

              <div
                v-else
                class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                <LeasingOfferOptionInlineCard
                  v-for="option in sortedOptions(offer.options)"
                  :key="option.id"
                  :option="option"
                  :offer-id="offer.id"
                  :deal-id="offer.deal_id"
                  @updated="onOptionUpdated"
                  @deleted="onOptionDeleted"
                  @show-map="mapOptionId = $event"
                />
                <LeasingOfferOptionInlineCard
                  v-if="showNewOptionCard"
                  :option="null"
                  :offer-id="offer.id"
                  :deal-id="offer.deal_id"
                  :default-display-order="nextDisplayOrder"
                  @created="onOptionCreated"
                  @cancel="onNewOptionCancel"
                />
              </div>
            </UCard>
          </div>

          <!-- Sidebar -->
          <div class="flex flex-col gap-4">
            <!-- Contact card -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Contact
                </h2>
              </template>
              <NuxtLink
                :to="`/leasing/contacts/${offer.contact_id}`"
                class="flex items-center gap-3 hover:opacity-80"
              >
                <UAvatar
                  :text="contactName.slice(0, 2).toUpperCase()"
                  size="md"
                  class="shrink-0 bg-elevated font-semibold text-highlighted"
                />
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ contactName }}
                  </p>
                  <p
                    v-if="offer.contact?.email"
                    class="text-sm text-dimmed"
                  >
                    {{ offer.contact.email }}
                  </p>
                </div>
              </NuxtLink>
              <template #footer>
                <NuxtLink :to="`/leasing/contacts/${offer.contact_id}`">
                  <UButton
                    label="View contact"
                    color="neutral"
                    variant="link"
                    trailing-icon="i-lucide-arrow-right"
                  />
                </NuxtLink>
              </template>
            </UCard>

            <!-- Deal card -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Deal
                </h2>
              </template>
              <NuxtLink
                :to="`/leasing/deals/${offer.deal_id}`"
                class="flex items-center justify-between hover:opacity-80"
              >
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ offer.deal?.desired_unit_class?.label ?? dealName }}
                  </p>
                  <p
                    v-if="offer.deal?.expected_move_in"
                    class="mt-1 text-sm text-dimmed"
                  >
                    Move-in {{ formatDate(offer.deal.expected_move_in) }}
                  </p>
                </div>
              </NuxtLink>
              <template #footer>
                <NuxtLink :to="`/leasing/deals/${offer.deal_id}`">
                  <UButton
                    label="View deal"
                    color="neutral"
                    variant="link"
                    trailing-icon="i-lucide-arrow-right"
                  />
                </NuxtLink>
              </template>
            </UCard>
          </div>
        </div>
      </div>

      <!-- Activity tab -->
      <template v-if="activeTab === 'activity'">
        <div class="flex flex-col gap-6">
          <ActivityTimeline
            subject-type="offer"
            :subject-id="offer.id"
          />

          <div
            v-if="offer.notes?.length"
            class="flex flex-col gap-3"
          >
            <UCard
              v-for="note in offer.notes"
              :key="`note-${note.id}`"
            >
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-lucide-sticky-note"
                  class="mt-0.5 size-4 shrink-0 text-dimmed"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-medium text-highlighted">
                      Note
                    </p>
                    <span class="shrink-0 text-xs text-dimmed">
                      {{ formatDateTime(note.created_at) }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ note.content }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </div>

    <!-- Edit offer form -->
    <LeasingOfferFormSlideover
      v-model:open="showOfferForm"
      :initial-deal-id="offer?.deal_id"
      :initial-contact-id="offer?.contact_id"
      @saved="onOfferSaved"
    />

    <UModal
      v-model:open="showOptionMap"
      :title="$t('forms.offer.mapTitle')"
      :ui="{ content: 'sm:max-w-6xl' }"
    >
      <template #body>
        <LeasingOfferOptionMapViewer :option-id="mapOptionId" />
      </template>
    </UModal>
  </UContainer>
</template>
