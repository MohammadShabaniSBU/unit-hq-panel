<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
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
  goToNextPage
} = useVoiceSessionList()

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
  <UContainer class="py-8">
    <UPageHeader
      :title="$t('pages.voiceSessions.title')"
      :description="$t('pages.voiceSessions.subtitle')"
    />

    <p class="mt-3 text-sm text-dimmed">
      {{ $t('pages.voiceSessions.dispositionUnknown') }}
    </p>

    <div class="mt-6 flex flex-wrap items-end gap-3">
      <UFormField :label="$t('pages.voiceSessions.dateFrom')">
        <UInput
          v-model="dateFrom"
          type="date"
        />
      </UFormField>
      <UFormField :label="$t('pages.voiceSessions.dateTo')">
        <UInput
          v-model="dateTo"
          type="date"
        />
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

    <div class="mt-6">
      <div
        v-if="pending"
        class="flex justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        :title="$t('pages.voiceSessions.loadError')"
        :actions="[{
          label: $t('common.retry'),
          color: 'neutral',
          variant: 'outline',
          onClick: () => refresh()
        }]"
      />

      <div
        v-else-if="!sessions.length"
        class="rounded-lg border border-dashed border-default px-6 py-16 text-center"
      >
        <p class="font-medium">
          {{ $t('pages.voiceSessions.emptyTitle') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('pages.voiceSessions.emptyBody') }}
        </p>
      </div>

      <template v-else>
        <UTable
          :data="sessions"
          :columns="columns"
        />
        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            {{ $t('common.showing', { count: showingCount, total }) }}
          </p>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-chevron-left"
              :disabled="!canGoPrev"
              @click="goToPrevPage"
            />
            <span class="text-sm tabular-nums">
              {{ page }} / {{ lastPage }}
            </span>
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-chevron-right"
              :disabled="!canGoNext"
              @click="goToNextPage"
            />
            <USelect
              v-model="perPage"
              :items="[25, 50, 100]"
              class="w-20"
            />
          </div>
        </div>
      </template>
    </div>
  </UContainer>
</template>
