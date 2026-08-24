<script setup lang="ts">
import type { ApiContract } from '~/types/contract'
import { contractUnitItem } from '~/types/contract'

const props = defineProps<{
  contactId: number
  contracts: Array<ApiContract>
}>()

const { t } = useI18n()
const toast = useToast()
const { formatDateTime } = useOrgDateFormat()

const contactIdRef = computed(() => props.contactId)

const {
  methods,
  pending,
  error,
  submitting,
  actionError,
  setup,
  setDefault,
  remove
} = useContactPaymentMethods(contactIdRef)

const showAdd = ref(false)
const showRemoveConfirm = ref(false)
const pendingRemoveId = ref<number | null>(null)
const selectedContractId = ref<number | null>(null)
const generatedLink = ref<string | null>(null)

const eligibleContracts = computed(() =>
  props.contracts.filter(c => ['pending', 'active', 'notice_given'].includes(c.status))
)

const contractOptions = computed(() =>
  eligibleContracts.value.map((contract) => {
    const unit = contractUnitItem(contract)?.item as { unit_number?: string } | null | undefined
    const unitLabel = unit?.unit_number ? ` · ${unit.unit_number}` : ''
    return {
      label: t('contacts.paymentMethods.contractOption', {
        id: contract.id,
        unit: unitLabel
      }),
      value: contract.id
    }
  })
)

watch(showAdd, (open) => {
  if (open) {
    selectedContractId.value = eligibleContracts.value[0]?.id ?? null
    generatedLink.value = null
    actionError.value = null
  }
})

function formatAddedDate(value: string | null): string {
  return formatDateTime(value)
}

const cardIcon = 'i-lucide-credit-card'

async function onSetDefault(id: number) {
  const ok = await setDefault(id)
  if (ok) {
    toast.add({ title: t('contacts.paymentMethods.defaultSuccess'), color: 'success' })
  }
}

function askRemove(id: number) {
  pendingRemoveId.value = id
  showRemoveConfirm.value = true
}

async function confirmRemove() {
  if (pendingRemoveId.value === null) return
  const ok = await remove(pendingRemoveId.value)
  if (ok) {
    toast.add({ title: t('contacts.paymentMethods.removeSuccess'), color: 'success' })
    showRemoveConfirm.value = false
    pendingRemoveId.value = null
  }
}

async function onGenerateLink() {
  if (selectedContractId.value === null) return

  const result = await setup(selectedContractId.value)
  if (!result) return

  if (!result.client_secret || !result.publishable_key) {
    toast.add({ title: t('contacts.paymentMethods.setupError'), color: 'error' })
    return
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({
    client_secret: result.client_secret,
    publishable_key: result.publishable_key
  })
  generatedLink.value = `${origin}/save-card?${params.toString()}`

  try {
    await navigator.clipboard.writeText(generatedLink.value)
    toast.add({ title: t('contacts.paymentMethods.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('contacts.paymentMethods.linkReady'), color: 'success' })
  }
}

async function copyLink() {
  if (!generatedLink.value) return
  try {
    await navigator.clipboard.writeText(generatedLink.value)
    toast.add({ title: t('contacts.paymentMethods.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('contacts.paymentMethods.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-dimmed">
          {{ $t('contacts.paymentMethods.title') }}
        </h2>
        <UButton
          icon="i-lucide-plus"
          :label="$t('contacts.paymentMethods.addCard')"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="eligibleContracts.length === 0"
          @click="showAdd = true"
        />
      </div>
    </template>

    <div
      v-if="pending"
      class="py-2 text-sm text-dimmed"
    >
      {{ $t('contacts.paymentMethods.loading') }}
    </div>
    <div
      v-else-if="error"
      class="py-2 text-sm text-error"
    >
      {{ $t('contacts.paymentMethods.loadError') }}
    </div>
    <div
      v-else-if="methods.length === 0"
      class="py-2 text-sm text-dimmed"
    >
      {{ $t('contacts.paymentMethods.empty') }}
    </div>
    <ul
      v-else
      class="divide-y divide-default"
    >
      <li
        v-for="method in methods"
        :key="method.id"
        class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div class="flex min-w-0 items-start gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
            <UIcon
              :name="cardIcon"
              class="size-4 text-dimmed"
            />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium text-highlighted">
                {{ method.display_label }}
              </p>
              <UBadge
                v-if="method.is_default"
                :label="$t('contacts.paymentMethods.defaultBadge')"
                color="primary"
                variant="subtle"
                size="sm"
              />
            </div>
            <p class="mt-0.5 text-xs text-dimmed">
              {{ $t('contacts.paymentMethods.addedOn', { date: formatAddedDate(method.created_at) }) }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <UButton
            v-if="!method.is_default"
            :label="$t('contacts.paymentMethods.setDefault')"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="submitting"
            @click="onSetDefault(method.id)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            :loading="submitting"
            :aria-label="$t('contacts.paymentMethods.remove')"
            @click="askRemove(method.id)"
          />
        </div>
      </li>
    </ul>

    <p
      v-if="actionError && !showAdd"
      class="mt-2 text-sm text-error"
    >
      {{ actionError }}
    </p>

    <p
      v-if="eligibleContracts.length === 0"
      class="mt-2 text-xs text-dimmed"
    >
      {{ $t('contacts.paymentMethods.noContracts') }}
    </p>
  </UCard>

  <UModal
    v-model:open="showRemoveConfirm"
    :title="$t('contacts.paymentMethods.removeConfirmTitle')"
  >
    <template #body>
      <p class="text-sm text-dimmed">
        {{ $t('contacts.paymentMethods.removeConfirm') }}
      </p>
      <p
        v-if="actionError"
        class="mt-2 text-sm text-error"
      >
        {{ actionError }}
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="showRemoveConfirm = false"
        />
        <UButton
          :label="$t('contacts.paymentMethods.remove')"
          color="error"
          :loading="submitting"
          @click="confirmRemove"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="showAdd"
    :title="$t('contacts.paymentMethods.addCardTitle')"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-dimmed">
          {{ $t('contacts.paymentMethods.addCardHint') }}
        </p>

        <UFormField :label="$t('contacts.paymentMethods.contract')">
          <USelect
            v-model="selectedContractId"
            :items="contractOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <div
          v-if="generatedLink"
          class="space-y-2 rounded-lg bg-elevated p-3"
        >
          <p class="text-xs font-medium text-dimmed">
            {{ $t('contacts.paymentMethods.saveCardLink') }}
          </p>
          <p class="break-all text-sm text-highlighted">
            {{ generatedLink }}
          </p>
          <UButton
            :label="$t('contacts.paymentMethods.copyLink')"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-copy"
            @click="copyLink"
          />
        </div>

        <p
          v-if="actionError"
          class="text-sm text-error"
        >
          {{ actionError }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="showAdd = false"
        />
        <UButton
          :label="$t('contacts.paymentMethods.generateLink')"
          color="primary"
          :loading="submitting"
          :disabled="selectedContractId === null"
          @click="onGenerateLink"
        />
      </div>
    </template>
  </UModal>
</template>
