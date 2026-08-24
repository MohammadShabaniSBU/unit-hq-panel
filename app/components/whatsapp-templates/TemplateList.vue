<script setup lang="ts">
import type { ApiWhatsappTemplate, WhatsappTemplateStatus } from '~/types/whatsapp-template'

const { t } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const showCreateModal = ref(false)

const {
  groups,
  totalCount,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  searchQuery,
  statusFilter,
  pending,
  error,
  refresh,
  syncTemplates,
  archiveTemplate
} = useWhatsappTemplatesList()

const statusOptions = computed(() => [
  { label: t('templates.whatsapp.filterActive'), value: 'active' },
  { label: t('templates.whatsapp.status.draft'), value: 'draft' },
  { label: t('templates.whatsapp.status.submitted'), value: 'submitted' },
  { label: t('templates.whatsapp.status.approved'), value: 'approved' },
  { label: t('templates.whatsapp.status.rejected'), value: 'rejected' },
  { label: t('templates.whatsapp.status.revoked'), value: 'revoked' },
  { label: t('templates.whatsapp.filterAll'), value: 'all' }
])

function statusColor(status: WhatsappTemplateStatus): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'approved': return 'success'
    case 'submitted': return 'info'
    case 'rejected':
    case 'revoked': return 'error'
    case 'draft': return 'warning'
    default: return 'neutral'
  }
}

function formatDate(iso: string | null) {
  return formatDateTime(iso)
}

function openEditor(row: ApiWhatsappTemplate) {
  navigateTo(`/marketing/templates/whatsapp/${row.id}`)
}

function onCreated(id: number) {
  navigateTo(`/marketing/templates/whatsapp/${id}`)
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('templates.whatsapp.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('templates.whatsapp.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :label="$t('templates.whatsapp.sync')"
          @click="syncTemplates"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('templates.whatsapp.newTemplate')"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('templates.whatsapp.search')"
        class="w-full sm:max-w-xs"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        class="w-full sm:w-48"
      />
      <p class="text-sm text-dimmed sm:ml-auto">
        {{ totalCount }} {{ $t('templates.whatsapp.totalTemplates') }}
      </p>
    </div>

    <div
      v-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
    >
      {{ $t('templates.whatsapp.loadError') }}
      <UButton
        class="ml-2"
        size="xs"
        variant="ghost"
        :label="$t('common.retry')"
        @click="refresh"
      />
    </div>

    <div
      v-else-if="pending && groups.length === 0"
      class="mt-10 flex justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="groups.length === 0"
      class="mt-10 rounded-lg border border-dashed border-default px-6 py-12 text-center text-sm text-dimmed"
    >
      {{ $t('templates.whatsapp.empty') }}
    </div>

    <div
      v-else
      class="mt-6 space-y-4"
    >
      <div
        v-for="group in groups"
        :key="group.name"
        class="rounded-lg border border-default bg-default/30 p-4"
      >
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <h2 class="font-medium text-highlighted">
            {{ group.name }}
          </h2>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ $t(`templates.whatsapp.category.${group.templates[0]?.category ?? 'utility'}`) }}
          </UBadge>
        </div>

        <div class="space-y-2">
          <button
            v-for="row in group.templates"
            :key="row.id"
            type="button"
            class="flex w-full flex-col gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-elevated sm:flex-row sm:items-center"
            @click="openEditor(row)"
          >
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                :color="statusColor(row.status)"
                variant="subtle"
                size="sm"
              >
                {{ row.language }}
              </UBadge>
              <span class="text-xs text-dimmed">
                {{ $t(`templates.whatsapp.status.${row.status}`) }}
              </span>
            </div>
            <div class="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-xs text-dimmed sm:justify-end">
              <span>{{ $t('templates.whatsapp.submittedAt') }}: {{ formatDate(row.submitted_at) }}</span>
              <span>{{ $t('templates.whatsapp.decidedAt') }}: {{ formatDate(row.decided_at) }}</span>
            </div>
            <UButton
              v-if="row.status !== 'archived'"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-archive"
              :aria-label="$t('templates.whatsapp.archive')"
              @click.stop="archiveTemplate(row.id)"
            />
          </button>
          <p
            v-for="row in group.templates.filter(r => r.status === 'rejected' && r.rejection_reason)"
            :key="`${row.id}-reason`"
            class="rounded-md bg-error/10 px-3 py-2 text-sm text-error"
          >
            <span class="font-medium">{{ row.language }}:</span>
            {{ row.rejection_reason }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="lastPage > 1"
      class="mt-6 flex items-center justify-end gap-2"
    >
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-chevron-left"
        :disabled="!canGoPrev"
        @click="page--"
      />
      <span class="text-sm text-dimmed">{{ page }} / {{ lastPage }}</span>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-chevron-right"
        :disabled="!canGoNext"
        @click="page++"
      />
    </div>

    <WhatsappTemplatesCreateModal
      v-model:open="showCreateModal"
      @created="onCreated"
    />
  </div>
</template>
