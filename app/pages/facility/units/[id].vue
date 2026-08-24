<script setup lang="ts">
import type { ApiUnit } from '~/types/facility'
import type { ApiUnitHold, ApiUnitOccupancy, PlaceUnitHoldPayload } from '~/types/unit'
import { formatUnitClass, formatUnitDimensions, formatUnitSite } from '~/composables/useUnitsList'
import { formatCivilDate } from '~/composables/useCivilDate'
import { formatMoney } from '~/composables/useMoney'
import { isOutOfServiceState } from '~/composables/useUnitState'

type HistoryItem
  = | { kind: 'occupancy', sortKey: string, occupancy: ApiUnitOccupancy }
    | { kind: 'hold', sortKey: string, hold: ApiUnitHold }

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const toast = useToast()
const { get } = useApi()

const unitId = computed(() => String(route.params.id))

const {
  data: unitData,
  pending: unitPending,
  error: unitError,
  refresh: refreshUnit
} = useAsyncData(
  () => `unit-${unitId.value}`,
  async () => {
    const response = await get<ApiUnit>(`/api/units/${unitId.value}`)
    return response.data
  },
  { watch: [unitId] }
)

const unit = computed(() => unitData.value ?? null)

const {
  holds,
  activeHold,
  pending: holdsPending,
  placing,
  releasing,
  refresh: refreshHolds,
  placeHold,
  releaseHold
} = useUnitHolds(unitId)

const {
  occupancies,
  pending: occupanciesPending,
  refresh: refreshOccupancies
} = useUnitOccupancies(unitId)

const showHoldForm = ref(false)
const showReleaseConfirm = ref(false)

const pending = computed(() => unitPending.value || holdsPending.value || occupanciesPending.value)
const isOccupied = computed(() => unit.value?.state === 'occupied')
const canTakeOutOfService = computed(() =>
  unit.value != null && unit.value.state === 'available'
)

const returnableHold = computed(() => {
  const hold = activeHold.value
  if (!hold || hold.hold_type === 'reservation' || hold.hold_type === 'overlock') {
    return null
  }
  if (!isOutOfServiceState(unit.value?.state)) {
    return null
  }
  return hold
})

const historyItems = computed<Array<HistoryItem>>(() => {
  const items: Array<HistoryItem> = []

  for (const occupancy of occupancies.value) {
    if (occupancy.ended_on == null) {
      continue
    }

    items.push({
      kind: 'occupancy',
      sortKey: `${occupancy.ended_on}T23:59:59|${String(occupancy.id).padStart(10, '0')}`,
      occupancy
    })
  }

  for (const hold of holds.value) {
    // Active covering hold belongs in Current state, not History.
    if (hold.released_at == null && activeHold.value?.id === hold.id) {
      continue
    }

    // Skip still-active indefinite holds that aren't the covering one (e.g. overlock).
    if (hold.released_at == null && hold.ends_on == null) {
      continue
    }

    const sortDate = hold.released_at?.slice(0, 10)
      ?? hold.ends_on
      ?? hold.starts_on

    items.push({
      kind: 'hold',
      sortKey: `${sortDate}T23:59:59|${String(hold.id).padStart(10, '0')}`,
      hold
    })
  }

  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
})

async function refreshAll() {
  await Promise.all([
    refreshUnit(),
    refreshHolds(),
    refreshOccupancies()
  ])
}

async function onPlaceHold(payload: PlaceUnitHoldPayload) {
  try {
    await placeHold(payload)
    toast.add({ title: t('units.holds.placeSuccess'), color: 'success' })
    showHoldForm.value = false
    await refreshAll()
  } catch {
    toast.add({ title: t('units.holds.placeError'), color: 'error' })
  }
}

async function onConfirmRelease() {
  const hold = returnableHold.value
  if (!hold) {
    return
  }

  try {
    await releaseHold(hold.id)
    toast.add({ title: t('units.holds.releaseSuccess'), color: 'success' })
    showReleaseConfirm.value = false
    await refreshAll()
  } catch {
    toast.add({ title: t('units.holds.releaseError'), color: 'error' })
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <UButton
        :to="localePath('/facility/units')"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="$t('units.detail.backToList')"
        class="mb-3"
      />

      <div
        v-if="pending && !unit"
        class="flex items-center justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="unitError || !unit"
        class="rounded-lg border border-error/30 bg-error/5 p-4"
      >
        <p class="text-sm text-error">
          {{ $t('units.detail.loadError') }}
        </p>
        <UButton
          :label="$t('common.retry')"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="refreshAll()"
        />
      </div>

      <template v-else>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold text-highlighted">
                {{ unit.unit_number }}
              </h1>
              <FacilityUnitStateBadge
                :state="unit.state"
                :overlock="unit.overlock"
              />
            </div>
            <p class="mt-1 text-sm text-dimmed">
              {{ formatUnitSite(unit) }}
              · {{ formatUnitClass(unit) }}
              · {{ formatUnitDimensions(unit) }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UTooltip
              v-if="isOccupied"
              :text="$t('units.holds.occupiedActionHint')"
            >
              <UButton
                :label="$t('units.holds.takeOutOfService')"
                color="neutral"
                variant="outline"
                disabled
              />
            </UTooltip>

            <UButton
              v-else-if="canTakeOutOfService"
              :label="$t('units.holds.takeOutOfService')"
              color="neutral"
              variant="outline"
              @click="showHoldForm = true"
            />

            <UButton
              v-if="returnableHold"
              :label="$t('units.holds.returnToService')"
              color="primary"
              :loading="releasing"
              @click="showReleaseConfirm = true"
            />
          </div>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-2">
          <!-- Current state -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('units.detail.currentState') }}
              </h2>
            </template>

            <div class="space-y-4 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-dimmed">
                  {{ $t('table.status') }}
                </span>
                <FacilityUnitStateBadge
                  :state="unit.state"
                  :overlock="unit.overlock"
                />
              </div>

              <p
                v-if="unit.overlock?.active"
                class="text-sm text-error"
              >
                {{
                  unit.overlock.delinquency_id
                    ? $t('units.overlock.caseNamed', { id: unit.overlock.delinquency_id })
                    : $t('units.overlock.label')
                }}
              </p>

              <div class="space-y-1 border-t border-default pt-3">
                <p class="text-dimmed">
                  {{ $t('access.unitRow.label') }}
                </p>
                <p
                  v-if="!unit.access?.mapped"
                  class="text-highlighted"
                >
                  {{ $t('access.unitRow.unmapped') }}
                </p>
                <template v-else>
                  <p class="text-highlighted">
                    {{ unit.access.point?.label }}
                  </p>
                  <p
                    v-if="unit.access.grants.length"
                    class="text-xs text-dimmed"
                  >
                    {{ $t('access.unitRow.grantedTo', {
                      names: unit.access.grants.map(g => g.contact_name).filter(Boolean).join(', ')
                    }) }}
                  </p>
                  <p
                    v-if="unit.access.overlock_denies_door || unit.access.suspension_denies"
                    class="text-xs text-error"
                  >
                    {{
                      unit.access.suspension_denies
                        ? $t('access.unitRow.suspended')
                        : $t('access.unitRow.overlocked')
                    }}
                  </p>
                </template>
              </div>

              <template v-if="unit.state === 'occupied'">
                <dl class="space-y-2">
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.tenant') }}
                    </dt>
                    <dd class="text-right font-medium text-highlighted">
                      <NuxtLink
                        v-if="unit.contract_id"
                        :to="localePath(`/leasing/contracts/${unit.contract_id}`)"
                        class="hover:underline"
                      >
                        {{ unit.tenant_name || $t('common.emptyValue') }}
                      </NuxtLink>
                      <span v-else>
                        {{ unit.tenant_name || $t('common.emptyValue') }}
                      </span>
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.since') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ formatCivilDate(unit.current_occupancy?.started_on) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.rent') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ formatMoney(unit.amount, unit.currency) }}
                    </dd>
                  </div>
                </dl>
              </template>

              <template v-else-if="unit.current_hold || activeHold">
                <dl class="space-y-2">
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.holdType') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{
                        $t(`units.holds.types.${(unit.current_hold ?? activeHold)!.hold_type}`)
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.holds.startsOn') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ formatCivilDate((unit.current_hold ?? activeHold)!.starts_on) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.holdEnds') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{
                        (unit.current_hold ?? activeHold)!.ends_on
                          ? formatCivilDate((unit.current_hold ?? activeHold)!.ends_on)
                          : $t('units.holds.indefinite')
                      }}
                    </dd>
                  </div>
                  <div
                    v-if="(unit.current_hold ?? activeHold)?.reason"
                    class="flex justify-between gap-4"
                  >
                    <dt class="text-dimmed">
                      {{ $t('units.holds.reason') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ (unit.current_hold ?? activeHold)?.reason }}
                    </dd>
                  </div>
                  <div
                    v-if="(unit.current_hold ?? activeHold)?.created_by"
                    class="flex justify-between gap-4"
                  >
                    <dt class="text-dimmed">
                      {{ $t('units.holds.createdBy') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      #{{ (unit.current_hold ?? activeHold)?.created_by }}
                    </dd>
                  </div>
                </dl>
              </template>

              <p
                v-else
                class="text-dimmed"
              >
                {{ $t('units.detail.availableMessage') }}
              </p>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('access.events.title') }}
              </h2>
            </template>
            <AccessAccessEventsTable
              :url="`/api/units/${unit.id}/access-events`"
              :show-contact="true"
            />
          </UCard>

          <!-- History -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('units.detail.history') }}
              </h2>
            </template>

            <div
              v-if="historyItems.length === 0"
              class="py-6 text-center text-sm text-dimmed"
            >
              {{ $t('units.detail.historyEmpty') }}
            </div>

            <ul
              v-else
              class="divide-y divide-default"
            >
              <li
                v-for="item in historyItems"
                :key="`${item.kind}-${item.kind === 'occupancy' ? item.occupancy.id : item.hold.id}`"
                class="py-3 text-sm"
              >
                <template v-if="item.kind === 'occupancy'">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">
                        {{ $t('units.detail.historyOccupancy') }}
                      </p>
                      <p class="mt-0.5 text-dimmed">
                        <NuxtLink
                          v-if="item.occupancy.contract_id"
                          :to="localePath(`/leasing/contracts/${item.occupancy.contract_id}`)"
                          class="hover:underline"
                        >
                          {{ item.occupancy.tenant_name || $t('common.emptyValue') }}
                        </NuxtLink>
                        <span v-else>
                          {{ item.occupancy.tenant_name || $t('common.emptyValue') }}
                        </span>
                      </p>
                    </div>
                    <p class="shrink-0 text-xs text-dimmed">
                      {{ formatCivilDate(item.occupancy.started_on) }}
                      –
                      {{ formatCivilDate(item.occupancy.ended_on) }}
                    </p>
                  </div>
                </template>

                <template v-else>
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">
                        {{ $t(`units.holds.types.${item.hold.hold_type}`) }}
                      </p>
                      <p
                        v-if="item.hold.reason"
                        class="mt-0.5 text-dimmed"
                      >
                        {{ item.hold.reason }}
                      </p>
                    </div>
                    <p class="shrink-0 text-xs text-dimmed">
                      {{ formatCivilDate(item.hold.starts_on) }}
                      –
                      {{
                        item.hold.released_at
                          ? formatCivilDate(item.hold.released_at.slice(0, 10))
                          : item.hold.ends_on
                            ? formatCivilDate(item.hold.ends_on)
                            : $t('units.holds.indefinite')
                      }}
                    </p>
                  </div>
                </template>
              </li>
            </ul>
          </UCard>
        </div>
      </template>
    </div>

    <FacilityUnitHoldFormSlideover
      v-if="unit"
      v-model:open="showHoldForm"
      :submitting="placing"
      @submit="onPlaceHold"
    />

    <UModal
      v-model:open="showReleaseConfirm"
      :title="$t('units.holds.returnToService')"
    >
      <template #body>
        <p class="text-sm text-dimmed">
          {{ $t('units.holds.releaseConfirm') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="$t('common.cancel')"
            @click="showReleaseConfirm = false"
          />
          <UButton
            color="primary"
            :label="$t('units.holds.returnToService')"
            :loading="releasing"
            @click="onConfirmRelease"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
