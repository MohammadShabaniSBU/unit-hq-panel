<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiLegalEntity } from '~/types/legalEntity'
import type { ApiInvoiceSeries } from '~/types/invoiceSeries'
import type { InvoiceSeriesListStatus } from '~/composables/useInvoiceSeriesList'

const route = useRoute()
const { t } = useI18n()
const { get } = useApi()

const entityId = computed(() => Number(route.params.id))

const {
  data: entityData,
  pending: entityPending,
  error: entityError,
  refresh: refreshEntity
} = useAsyncData(
  () => `legal-entity-${entityId.value}`,
  () => get<ApiLegalEntity>(`/api/legal-entities/${entityId.value}`),
  { watch: [entityId] }
)

const entity = computed(() => entityData.value?.data ?? null)

const showEntityForm = ref(false)
const formEntity = ref<ApiLegalEntity | null>(null)
const showSeriesForm = ref(false)
const archiveTarget = ref<ApiInvoiceSeries | null>(null)
const showArchiveConfirm = ref(false)

const {
  statusFilter,
  series,
  pending: seriesPending,
  error: seriesError,
  refresh: refreshSeries,
  setDefault,
  archiveSeries,
  unarchiveSeries
} = useInvoiceSeriesList(entityId)

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusItems = computed(() => [
  { value: 'active' as InvoiceSeriesListStatus, label: t('settings.invoiceSeries.statusActive') },
  { value: 'archived' as InvoiceSeriesListStatus, label: t('settings.invoiceSeries.statusArchived') },
  { value: 'all' as InvoiceSeriesListStatus, label: t('settings.invoiceSeries.statusAll') }
])

function openEditEntity() {
  if (!entity.value) {
    return
  }
  formEntity.value = entity.value
  showEntityForm.value = true
}

function requestArchive(item: ApiInvoiceSeries) {
  archiveTarget.value = item
  showArchiveConfirm.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) {
    return
  }

  const ok = await archiveSeries(archiveTarget.value)
  if (ok) {
    showArchiveConfirm.value = false
    archiveTarget.value = null
  }
}

async function onEntitySaved() {
  await refreshEntity()
}

const columns = computed<Array<TableColumn<ApiInvoiceSeries>>>(() => [
  {
    accessorKey: 'code',
    header: t('settings.invoiceSeries.code'),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.code),
      row.original.is_default
        ? h(UBadge, {
            label: t('settings.invoiceSeries.defaultBadge'),
            color: 'primary',
            variant: 'subtle',
            size: 'sm'
          })
        : null
    ])
  },
  {
    accessorKey: 'kind',
    header: t('settings.invoiceSeries.kind'),
    cell: ({ row }) => t(`settings.invoiceSeries.kinds.${row.original.kind}`)
  },
  {
    accessorKey: 'next_number',
    header: t('settings.invoiceSeries.nextNumber'),
    cell: ({ row }) => String(row.original.next_number)
  },
  {
    accessorKey: 'issued_count',
    header: t('settings.invoiceSeries.issuedCount'),
    cell: ({ row }) => String(row.original.issued_count ?? 0)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      return h(UBadge, {
        label: archived
          ? t('settings.invoiceSeries.statusArchived')
          : t('settings.invoiceSeries.statusActive'),
        color: archived ? 'neutral' : 'success',
        variant: 'subtle',
        size: 'sm'
      })
    }
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: ({ row }) => {
      const archived = row.original.archived_at != null
      const actions: Array<{ label: string, icon: string, onSelect: () => void }> = []

      if (!archived && !row.original.is_default) {
        actions.push({
          label: t('settings.invoiceSeries.setDefault'),
          icon: 'i-lucide-star',
          onSelect() {
            setDefault(row.original)
          }
        })
      }

      actions.push({
        label: archived
          ? t('settings.invoiceSeries.unarchive')
          : t('settings.invoiceSeries.archive'),
        icon: archived ? 'i-lucide-archive-restore' : 'i-lucide-archive',
        onSelect() {
          if (archived) {
            unarchiveSeries(row.original)
            return
          }
          requestArchive(row.original)
        }
      })

      return h(UDropdownMenu, {
        items: [actions],
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          'icon': 'i-lucide-ellipsis',
          'color': 'neutral',
          'variant': 'ghost',
          'size': 'sm',
          'square': true,
          'aria-label': t('common.actions')
        })
      })
    }
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <UButton
        to="/settings/legal-entities"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="$t('settings.invoiceSeries.backToList')"
        class="mb-3"
      />

      <div
        v-if="entityPending"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="entityError || !entity"
        class="rounded-lg border border-error/30 bg-error/5 p-4"
      >
        <p class="text-sm text-error">
          {{ $t('settings.invoiceSeries.entityLoadError') }}
        </p>
        <UButton
          :label="$t('common.retry')"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="refreshEntity()"
        />
      </div>

      <template v-else>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-highlighted">
              {{ entity.legal_name }}
            </h1>
            <p
              v-if="entity.trading_name"
              class="mt-1 text-sm text-dimmed"
            >
              {{ entity.trading_name }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ entity.tax_id }} · {{ entity.city }}, {{ entity.country_code }}
            </p>
          </div>
          <UButton
            icon="i-lucide-pencil"
            :label="$t('common.edit')"
            color="neutral"
            variant="outline"
            @click="openEditEntity"
          />
        </div>

        <section class="mt-10">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ $t('forms.stripe.title') }}
            </h2>
            <p class="mt-1 text-sm text-dimmed">
              {{ $t('forms.stripe.entitySubtitle') }}
            </p>
          </div>
          <SettingsLegalEntityPaymentsCard :legal-entity-id="entity.id" />
        </section>

        <section class="mt-10">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ $t('settings.invoiceSeries.title') }}
              </h2>
              <p class="mt-1 text-sm text-dimmed">
                {{ $t('settings.invoiceSeries.subtitle') }}
              </p>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <USelect
                v-model="statusFilter"
                :items="statusItems"
                value-key="value"
                label-key="label"
                class="w-full sm:w-40"
              />
              <UButton
                icon="i-lucide-plus"
                :label="$t('settings.invoiceSeries.add')"
                color="primary"
                class="shrink-0"
                @click="showSeriesForm = true"
              />
            </div>
          </div>

          <div
            v-if="seriesPending"
            class="mt-6 flex items-center justify-center py-12"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin text-dimmed"
            />
          </div>

          <div
            v-else-if="seriesError"
            class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
          >
            <p class="text-sm text-error">
              {{ $t('settings.invoiceSeries.loadError') }}
            </p>
            <UButton
              :label="$t('common.retry')"
              color="neutral"
              variant="outline"
              size="sm"
              class="mt-3"
              @click="refreshSeries()"
            />
          </div>

          <div
            v-else
            class="mt-6 overflow-hidden rounded-lg border border-default"
          >
            <UTable
              :data="series"
              :columns="columns"
            />
          </div>
        </section>
      </template>
    </div>

    <SettingsLegalEntityFormSlideover
      v-model:open="showEntityForm"
      v-model:entity="formEntity"
      @saved="onEntitySaved"
    />

    <SettingsInvoiceSeriesFormSlideover
      v-model:open="showSeriesForm"
      :entity-id="entityId"
      @saved="refreshSeries()"
    />

    <UModal
      v-model:open="showArchiveConfirm"
      :title="$t('settings.invoiceSeries.archiveConfirmTitle')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ $t('settings.invoiceSeries.archiveConfirmBody', {
            code: archiveTarget?.code ?? ''
          }) }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="showArchiveConfirm = false"
          />
          <UButton
            :label="$t('settings.invoiceSeries.archive')"
            color="error"
            @click="confirmArchive"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
