<script setup lang="ts">
import { dealStatusColor } from '~/composables/useDealsList'
import { leaseStatusColor } from '~/composables/useLeasesList'
import { reservationStatusColor } from '~/composables/useReservationsList'

type ContactTab = 'overview' | 'activity' | 'deals' | 'reservations' | 'contracts' | 'files'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const contactId = computed(() => String(route.params.id))

const {
  contact,
  activeLease,
  openDeal,
  pendingTasks,
  lifecycleJourneySteps,
  pending,
  error,
  refresh
} = useContactDetail(contactId.value)

const activeTab = ref<ContactTab>('overview')
const showDealForm = ref(false)

const initials = computed(() => {
  if (!contact.value) return '?'
  return [contact.value.first_name, contact.value.last_name]
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const fullName = computed(() =>
  contact.value
    ? [contact.value.first_name, contact.value.last_name].filter(Boolean).join(' ')
    : ''
)

const lifecycleStatusColor = computed(() => {
  const s = contact.value?.status
  if (s === 'tenant') return 'success'
  if (s === 'opportunity') return 'info'
  if (s === 'lead') return 'warning'
  if (s === 'lost') return 'error'
  return 'neutral'
})

const journeyStepLabels: Record<string, string> = {
  prospect: 'Contact',
  lead: 'Deal',
  opportunity: 'Reservation',
  tenant: 'Active'
}

const tabs = computed<Array<{ key: ContactTab; label: string; count?: number }>>(() => [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'deals', label: 'Deals', count: contact.value?.deals?.length },
  { key: 'reservations', label: 'Reservations', count: contact.value?.reservations?.length },
  { key: 'contracts', label: 'Contracts', count: contact.value?.leases?.length },
  { key: 'files', label: 'Files' }
])

function onDealSaved() {
  refresh()
  toast.add({ title: t('forms.deal.createSuccessMessage'), color: 'success' })
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
      v-else-if="error || !contact"
      class="rounded-xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <p class="text-sm text-error">
        Failed to load contact.
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
        <div class="flex min-w-0 items-start gap-4">
          <UAvatar
            :text="initials"
            size="xl"
            class="shrink-0 bg-elevated text-lg font-semibold text-highlighted"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-semibold text-highlighted">
                {{ fullName }}
              </h1>
              <UBadge
                :color="lifecycleStatusColor"
                variant="subtle"
                :label="$t(`status.contact.${contact.status}`)"
              />
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
              <span
                v-if="contact.company"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-building-2"
                  class="size-3.5"
                />
                {{ contact.company }}
              </span>
              <span
                v-if="contact.email"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="size-3.5"
                />
                {{ contact.email }}
              </span>
              <span
                v-for="channel in contact.channels"
                :key="channel.id"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="size-3.5"
                />
                {{ channel.value }}
              </span>
              <span
                v-if="contact.source"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-tag"
                  class="size-3.5"
                />
                {{ $t(`contactSource.${contact.source}`) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            icon="i-lucide-message-square"
            label="Message"
            color="neutral"
            variant="outline"
          />
          <UButton
            icon="i-lucide-clipboard-list"
            label="Log activity"
            color="neutral"
            variant="outline"
          />
          <UButton
            icon="i-lucide-plus"
            label="New deal"
            color="primary"
            @click="showDealForm = true"
          />
        </div>
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
      <template v-if="activeTab === 'overview'">
        <!-- Stats row -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Active lease
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ activeLease ? activeLease.unit?.unit_number ?? '—' : 'None' }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ activeLease ? activeLease.unit?.site?.name : 'No active unit' }}
              </p>
            </div>
          </UCard>
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Monthly rate
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ activeLease ? `£${activeLease.actual_rate}` : '—' }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ activeLease ? activeLease.unit?.unit_class?.label ?? '' : 'No active lease' }}
              </p>
            </div>
          </UCard>
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Tenancy start
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ activeLease?.start_date ?? '—' }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ activeLease ? 'Active lease' : 'No active lease' }}
              </p>
            </div>
          </UCard>
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Open deals
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ contact.deals?.filter(d => !['closed_won','closed_lost'].includes(d.status)).length ?? 0 }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ contact.deals?.length ?? 0 }} total deals
              </p>
            </div>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <!-- Left column -->
          <div class="flex flex-col gap-4 xl:col-span-2">
            <!-- Customer journey -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Customer journey
                </h2>
              </template>
              <div class="grid grid-cols-4 gap-2">
                <div
                  v-for="(step, index) in lifecycleJourneySteps"
                  :key="step.key"
                  class="relative flex flex-col items-center text-center"
                >
                  <div
                    v-if="index < lifecycleJourneySteps.length - 1"
                    class="absolute left-1/2 top-3 h-0.5 w-full"
                    :class="step.completed ? 'bg-success/40' : 'bg-default'"
                  />
                  <div
                    class="relative z-10 flex size-6 items-center justify-center rounded-full border-2"
                    :class="step.active
                      ? 'border-primary bg-primary text-inverted'
                      : step.completed
                        ? 'border-success bg-success text-inverted'
                        : 'border-default bg-default text-dimmed'"
                  >
                    <UIcon
                      v-if="step.completed"
                      name="i-lucide-check"
                      class="size-3.5"
                    />
                    <span
                      v-else
                      class="size-2 rounded-full bg-current"
                    />
                  </div>
                  <p class="mt-3 text-xs font-medium text-highlighted">
                    {{ journeyStepLabels[step.key] ?? step.key }}
                  </p>
                  <div
                    class="mt-2 h-1 w-full rounded-full"
                    :class="step.active ? 'bg-primary' : step.completed ? 'bg-success' : 'bg-elevated'"
                  />
                </div>
              </div>
            </UCard>

            <!-- Active lease details -->
            <UCard v-if="activeLease">
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Rented unit
                </h2>
              </template>
              <div class="flex items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated">
                  <UIcon
                    name="i-lucide-box"
                    class="size-5 text-dimmed"
                  />
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-highlighted">
                    {{ activeLease.unit?.unit_number }}
                  </p>
                  <p class="text-sm text-dimmed">
                    {{ activeLease.unit?.unit_class?.label }}
                  </p>
                  <p class="text-sm text-dimmed">
                    {{ activeLease.unit?.site?.name }}
                  </p>
                </div>
              </div>
              <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-default pt-4 text-sm">
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Monthly rate
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    £{{ activeLease.actual_rate }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Insurance
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ activeLease.actual_insurance ? `£${activeLease.actual_insurance}` : '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Start date
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ activeLease.start_date }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Status
                  </dt>
                  <dd class="mt-1">
                    <UBadge
                      :label="$t(`leaseStatus.${activeLease.status}`)"
                      :color="leaseStatusColor(activeLease.status)"
                      variant="subtle"
                      size="sm"
                    />
                  </dd>
                </div>
              </dl>
              <template #footer>
                <UButton
                  label="View contract"
                  color="neutral"
                  variant="link"
                  trailing-icon="i-lucide-arrow-right"
                  @click="activeTab = 'contracts'"
                />
              </template>
            </UCard>

            <!-- Recent activity: tasks + comments -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Recent activity
                </h2>
              </template>
              <div
                v-if="!contact.tasks?.length && !contact.comments?.length"
                class="py-6 text-center text-sm text-dimmed"
              >
                No activity yet.
              </div>
              <ul
                v-else
                class="divide-y divide-default"
              >
                <li
                  v-for="task in contact.tasks?.slice(0, 5)"
                  :key="`task-${task.id}`"
                  class="flex gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
                    <UIcon
                      name="i-lucide-check-circle"
                      class="size-4 text-dimmed"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                      <p class="text-sm font-medium text-highlighted">
                        {{ task.title }}
                      </p>
                      <span class="shrink-0 text-xs text-dimmed">
                        {{ task.due_date ?? task.created_at }}
                      </span>
                    </div>
                    <p
                      v-if="task.description"
                      class="mt-1 text-sm text-dimmed"
                    >
                      {{ task.description }}
                    </p>
                  </div>
                </li>
                <li
                  v-for="comment in contact.comments?.slice(0, 3)"
                  :key="`comment-${comment.id}`"
                  class="flex gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
                    <UIcon
                      name="i-lucide-sticky-note"
                      class="size-4 text-dimmed"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted">
                      Note
                    </p>
                    <p class="mt-1 text-sm text-dimmed">
                      {{ comment.body }}
                    </p>
                    <span class="text-xs text-dimmed">
                      {{ comment.created_at }}
                    </span>
                  </div>
                </li>
              </ul>
            </UCard>
          </div>

          <!-- Right column sidebar -->
          <div class="flex flex-col gap-4">
            <!-- Open deal card -->
            <UCard v-if="openDeal">
              <template #header>
                <div class="flex items-start justify-between gap-3">
                  <h2 class="text-sm font-medium text-dimmed">
                    Open deal
                  </h2>
                  <UBadge
                    :label="$t(`dealStatus.${openDeal.status}`)"
                    :color="dealStatusColor(openDeal.status)"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </template>
              <div>
                <p class="font-semibold text-highlighted">
                  {{ openDeal.desired_unit_class?.label ?? `Deal #${openDeal.id}` }}
                </p>
                <p class="mt-1 text-sm text-dimmed">
                  {{ openDeal.expected_move_in ? `Move-in: ${openDeal.expected_move_in}` : 'No move-in date set' }}
                </p>
                <p
                  v-if="openDeal.intent_notes"
                  class="mt-2 text-sm text-dimmed line-clamp-2"
                >
                  {{ openDeal.intent_notes }}
                </p>
              </div>
              <template #footer>
                <div class="flex gap-2">
                  <UButton
                    label="View deal"
                    color="primary"
                    variant="soft"
                    class="flex-1"
                    :to="`/marketing/deals/${openDeal.id}`"
                  />
                </div>
              </template>
            </UCard>

            <!-- Upcoming tasks -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Upcoming tasks
                </h2>
              </template>
              <div
                v-if="!pendingTasks.length"
                class="py-4 text-center text-sm text-dimmed"
              >
                No pending tasks.
              </div>
              <ul
                v-else
                class="space-y-3"
              >
                <li
                  v-for="task in pendingTasks.slice(0, 5)"
                  :key="task.id"
                  class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2.5"
                >
                  <span class="text-sm font-medium text-highlighted">
                    {{ task.title }}
                  </span>
                  <span
                    class="text-xs font-medium"
                    :class="{
                      'text-error': task.priority === 'urgent' || task.priority === 'high',
                      'text-warning': task.priority === 'medium',
                      'text-dimmed': task.priority === 'low'
                    }"
                  >
                    {{ task.due_date ?? '—' }}
                  </span>
                </li>
              </ul>
            </UCard>

            <!-- Contact info -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Contact info
                </h2>
              </template>
              <dl class="space-y-3 text-sm">
                <div v-if="contact.email">
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Email
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ contact.email }}
                  </dd>
                </div>
                <div
                  v-for="ch in contact.channels"
                  :key="ch.id"
                >
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ ch.type }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ ch.value }}
                  </dd>
                </div>
                <div v-if="contact.source">
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Source
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ $t(`contactSource.${contact.source}`) }}
                  </dd>
                </div>
                <div v-if="contact.source_detail">
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Source detail
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ contact.source_detail }}
                  </dd>
                </div>
              </dl>
            </UCard>
          </div>
        </div>
      </template>

      <!-- Deals tab -->
      <template v-if="activeTab === 'deals'">
        <div class="flex items-center justify-between">
          <p class="text-sm text-dimmed">
            {{ contact.deals?.length ?? 0 }} deal{{ (contact.deals?.length ?? 0) !== 1 ? 's' : '' }}
          </p>
          <UButton
            icon="i-lucide-plus"
            label="New deal"
            color="primary"
            size="sm"
            @click="showDealForm = true"
          />
        </div>
        <div
          v-if="!contact.deals?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No deals yet. Create the first one.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <NuxtLink
            v-for="deal in contact.deals"
            :key="deal.id"
            :to="`/marketing/deals/${deal.id}`"
            class="block"
          >
            <UCard class="cursor-pointer transition-colors hover:bg-elevated/50">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ deal.desired_unit_class?.label ?? `Deal #${deal.id}` }}
                  </p>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ deal.expected_move_in ? `Move-in ${deal.expected_move_in}` : 'No move-in date' }}
                    <template v-if="deal.offers?.length">
                      · {{ deal.offers.length }} offer{{ deal.offers.length !== 1 ? 's' : '' }}
                    </template>
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :label="$t(`dealStatus.${deal.status}`)"
                    :color="dealStatusColor(deal.status)"
                    variant="subtle"
                    size="sm"
                  />
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-4 text-dimmed"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </template>

      <!-- Reservations tab -->
      <template v-if="activeTab === 'reservations'">
        <div
          v-if="!contact.reservations?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No reservations yet.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <UCard
            v-for="res in contact.reservations"
            :key="res.id"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium text-highlighted">
                  Unit {{ res.unit?.unit_number ?? `#${res.unit_id}` }}
                </p>
                <p class="mt-1 text-sm text-dimmed">
                  {{ res.unit?.site?.name }}
                  · Expires {{ res.expires_at }}
                </p>
              </div>
              <UBadge
                :label="$t(`reservationStatus.${res.status}`)"
                :color="reservationStatusColor(res.status)"
                variant="subtle"
                size="sm"
              />
            </div>
          </UCard>
        </div>
      </template>

      <!-- Contracts tab -->
      <template v-if="activeTab === 'contracts'">
        <div
          v-if="!contact.leases?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No contracts yet.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <UCard
            v-for="lease in contact.leases"
            :key="lease.id"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium text-highlighted">
                  Unit {{ lease.unit?.unit_number ?? `#${lease.unit_id}` }}
                  · £{{ lease.actual_rate }}/mo
                </p>
                <p class="mt-1 text-sm text-dimmed">
                  {{ lease.unit?.site?.name }}
                  · From {{ lease.start_date }}{{ lease.end_date ? ` to ${lease.end_date}` : '' }}
                </p>
              </div>
              <UBadge
                :label="$t(`leaseStatus.${lease.status}`)"
                :color="leaseStatusColor(lease.status)"
                variant="subtle"
                size="sm"
              />
            </div>
          </UCard>
        </div>
      </template>

      <!-- Activity tab -->
      <template v-if="activeTab === 'activity'">
        <div
          v-if="!contact.tasks?.length && !contact.comments?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No activity yet.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <UCard
            v-for="task in contact.tasks"
            :key="`task-${task.id}`"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check-circle"
                class="mt-0.5 size-4 shrink-0 text-dimmed"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-highlighted">
                    {{ task.title }}
                  </p>
                  <span class="shrink-0 text-xs text-dimmed">
                    {{ task.created_at }}
                  </span>
                </div>
                <p
                  v-if="task.description"
                  class="mt-1 text-sm text-dimmed"
                >
                  {{ task.description }}
                </p>
              </div>
            </div>
          </UCard>
          <UCard
            v-for="comment in contact.comments"
            :key="`comment-${comment.id}`"
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
                    {{ comment.created_at }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-dimmed">
                  {{ comment.body }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </template>

      <!-- Files tab (deferred) -->
      <div
        v-if="activeTab === 'files'"
        class="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
      >
        <p class="text-sm text-dimmed">
          Files coming soon.
        </p>
      </div>
    </div>

    <!-- New deal form (pre-fills contact_id) -->
    <MarketingDealFormSlideover
      v-model:open="showDealForm"
      :initial-contact-id="contact?.id"
      @saved="onDealSaved"
    />
  </UContainer>
</template>
