<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { VoiceSession } from '~/types/voiceSession'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.AiAgentUse)) {
  await navigateTo('/leasing/contacts')
}

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const fromDateInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)
const toDateInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)

const { items: siteItems } = useOptions('/api/sites/options')

const {
  sessions,
  total,
  showingCount,
  page,
  perPage,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  dateFrom,
  dateTo,
  siteId,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useVoiceSessionList()

function parseIsoDate(value: string): CalendarDate | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new CalendarDate(Number(y), Number(m), Number(d))
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const fromDateValue = computed({
  get: () => parseIsoDate(dateFrom.value),
  set: (value: CalendarDate | null) => {
    dateFrom.value = formatIsoDate(value)
  }
})

const toDateValue = computed({
  get: () => parseIsoDate(dateTo.value),
  set: (value: CalendarDate | null) => {
    dateTo.value = formatIsoDate(value)
  }
})

const siteFilterItems = computed(() => [
  { value: null as number | null, label: t('pages.voiceSessions.allSites') },
  ...siteItems.value.map(site => ({ value: site.value, label: site.label }))
])

function contactLabel(session: VoiceSession): string {
  if (!session.contact) {
    return t('pages.voiceSessions.noContact')
  }
  return [session.contact.first_name, session.contact.last_name].filter(Boolean).join(' ')
}

function formatSpan(seconds: number | null): string {
  if (seconds == null) {
    return t('common.emptyValue')
  }
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) {
    return t('pages.voiceSessions.spanSeconds', { seconds: rest })
  }
  return t('pages.voiceSessions.spanMinutes', { minutes, seconds: rest })
}

function openDetail(session: VoiceSession) {
  void navigateTo(`/leasing/voice-sessions/${session.id}`)
}

function onRowSelect(_event: Event, row: TableRow<VoiceSession>) {
  if (pending.value) {
    return
  }

  openDetail(row.original)
}

const columns = computed<Array<TableColumn<VoiceSession>>>(() => [
  {
    accessorKey: 'started_at',
    header: t('pages.voiceSessions.columns.started'),
    cell: ({ row }) => formatDateTime(row.original.started_at, { empty: t('common.emptyValue') })
  },
  {
    id: 'caller',
    header: t('pages.voiceSessions.columns.caller'),
    cell: ({ row }) => row.original.caller_number ?? t('pages.voiceSessions.callerWithheld')
  },
  {
    id: 'contact',
    header: t('pages.voiceSessions.columns.contact'),
    cell: ({ row }) => {
      const session = row.original
      if (!session.contact) {
        return t('pages.voiceSessions.noContact')
      }
      return h('button', {
        type: 'button',
        class: 'font-medium text-highlighted hover:underline',
        onClick: (event: Event) => {
          event.stopPropagation()
          void navigateTo(`/leasing/contacts/${session.contact!.id}`)
        }
      }, contactLabel(session))
    }
  },
  {
    id: 'site',
    header: t('pages.voiceSessions.columns.site'),
    cell: ({ row }) => row.original.site?.name ?? t('common.emptyValue')
  },
  {
    id: 'span',
    header: t('pages.voiceSessions.columns.delegatedSpan'),
    cell: ({ row }) => formatSpan(row.original.delegated_span_seconds)
  },
  {
    id: 'transfer',
    header: t('pages.voiceSessions.columns.transferRequested'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.transfer_requested
        ? t('pages.voiceSessions.transferYes')
        : t('pages.voiceSessions.transferNo'),
      color: row.original.transfer_requested ? 'warning' : 'neutral',
      variant: 'subtle'
    })
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UButton, {
      size: 'xs',
      variant: 'ghost',
      icon: 'i-lucide-eye',
      onClick: () => openDetail(row.original)
    })
  }
])
</script>

<template>
  <UContainer class="flex h-[calc(100svh-4rem)] flex-col overflow-hidden py-8">
    <div class="shrink-0">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('pages.voiceSessions.title') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('pages.voiceSessions.subtitle') }}
      </p>
      <p class="mt-3 text-sm text-dimmed">
        {{ $t('pages.voiceSessions.dispositionUnknown') }}
      </p>
    </div>

    <div class="mt-6 flex shrink-0 flex-wrap items-end gap-3">
      <UFormField :label="$t('pages.voiceSessions.dateFrom')">
        <UInputDate
          ref="fromDateInput"
          v-model="fromDateValue"
          class="w-44"
        >
          <template #trailing>
            <UPopover :reference="fromDateInput?.inputsRef?.[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                :aria-label="$t('pages.voiceSessions.dateFrom')"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="fromDateValue"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>
      <UFormField :label="$t('pages.voiceSessions.dateTo')">
        <UInputDate
          ref="toDateInput"
          v-model="toDateValue"
          class="w-44"
        >
          <template #trailing>
            <UPopover :reference="toDateInput?.inputsRef?.[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                :aria-label="$t('pages.voiceSessions.dateTo')"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="toDateValue"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>
      <UFormField :label="$t('pages.voiceSessions.site')">
        <USelect
          v-model="siteId"
          :items="siteFilterItems"
          value-key="value"
          label-key="label"
          class="w-56"
        />
      </UFormField>
    </div>

    <div
      v-if="pending && !sessions.length"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error && !sessions.length"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('pages.voiceSessions.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="!sessions.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('pages.voiceSessions.emptyTitle') }}
      </p>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('pages.voiceSessions.emptyBody') }}
      </p>
    </div>

    <template v-else>
      <div
        class="mt-6 min-h-0 flex-1"
        :class="pending ? '[&_tbody_tr]:pointer-events-none [&_tbody_tr]:cursor-wait' : ''"
      >
        <UTable
          :data="sessions"
          :columns="columns"
          :loading="pending"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="onRowSelect"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        class="shrink-0"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="total"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>
  </UContainer>
</template>
