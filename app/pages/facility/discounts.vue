<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiDiscount } from '~/types/facility'
import {
  formatDiscountDuration,
  formatDiscountValue,
  useDiscountsList
} from '~/composables/useDiscountsList'

const formDiscount = ref<ApiDiscount | null>(null)
const showForm = ref(false)

const {
  searchQuery,
  paginatedDiscounts,
  totalCount,
  showingCount,
  perPage,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useDiscountsList()

const { t } = useI18n()
const toast = useToast()
const { del } = useApi()

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function openCreate() {
  formDiscount.value = null
  showForm.value = true
}

function openEdit(discount: ApiDiscount) {
  formDiscount.value = discount
  showForm.value = true
}

async function handleDelete(discount: ApiDiscount) {
  try {
    await del(`/api/discounts/${discount.id}`)
    toast.add({
      title: t('pages.discounts.deleteSuccessMessage'),
      color: 'success'
    })
    refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.discounts.deleteErrorMessage'),
      color: 'error'
    })
  }
}

function formatDiscountType(type: ApiDiscount['discount_type']) {
  return type === 'percentage'
    ? t('forms.discount.typePercentage')
    : t('forms.discount.typeFixedAmount')
}

function formatEffectiveRange(discount: ApiDiscount) {
  if (!discount.effective_from && !discount.effective_to) {
    return t('common.emptyValue')
  }

  const from = discount.effective_from ?? t('common.emptyValue')
  const to = discount.effective_to ?? t('common.emptyValue')

  return `${from} → ${to}`
}

const columns = computed<TableColumn<ApiDiscount>[]>(() => [
  {
    accessorKey: 'label',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.label),
      row.original.code
        ? h('span', { class: 'text-xs text-dimmed' }, row.original.code)
        : null
    ])
  },
  {
    id: 'discount_type',
    header: t('table.type'),
    cell: ({ row }) => formatDiscountType(row.original.discount_type)
  },
  {
    id: 'value',
    header: t('table.value'),
    cell: ({ row }) => formatDiscountValue(row.original)
  },
  {
    id: 'duration',
    header: t('table.duration'),
    cell: ({ row }) => formatDiscountDuration(row.original, t)
  },
  {
    id: 'effective',
    header: t('table.effectiveDates'),
    cell: ({ row }) => formatEffectiveRange(row.original)
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
    cell: ({ row }) => h(UDropdownMenu, {
      items: [[
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            openEdit(row.original)
          }
        },
        {
          label: t('common.delete'),
          icon: 'i-lucide-trash-2',
          color: 'error',
          onSelect() {
            handleDelete(row.original)
          }
        }
      ]],
      content: { align: 'end' }
    }, {
      default: () => h(UButton, {
        icon: 'i-lucide-ellipsis',
        color: 'neutral',
        variant: 'ghost',
        size: 'sm',
        square: true,
        'aria-label': t('common.actions')
      })
    })
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.discounts.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.discounts.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.discounts.search')"
          class="w-full sm:w-72"
        />

        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.discounts.addDiscount')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('pages.discounts.loadError') }}
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

    <template v-else>
      <div
        class="mt-6 overflow-hidden rounded-lg border border-default"
        style="height: calc(100vh - 280px)"
      >
        <UTable
          :data="paginatedDiscounts"
          :columns="columns"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <FacilityDiscountFormSlideover
      v-model:open="showForm"
      v-model:discount="formDiscount"
      @saved="refresh()"
    />
  </UContainer>
</template>
