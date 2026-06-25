<script setup lang="ts">
import type { ApiContactAddress } from '~/types/contactAddress'

const props = defineProps<{
  contactId: number
  addresses?: Array<ApiContactAddress>
}>()

const emit = defineEmits<{
  added: [address: ApiContactAddress]
  updated: [address: ApiContactAddress]
  removed: [addressId: number]
}>()

const showAddressForm = ref(false)
const editingAddress = ref<ApiContactAddress | null>(null)

const sortedAddresses = computed(() => {
  return [...(props.addresses ?? [])].sort((a, b) => {
    if (a.is_primary === b.is_primary) return 0
    return a.is_primary ? -1 : 1
  })
})

function openAddAddress() {
  editingAddress.value = null
  showAddressForm.value = true
}

function openEditAddress(address: ApiContactAddress) {
  editingAddress.value = address
  showAddressForm.value = true
}

function onAddressSaved(address: ApiContactAddress) {
  if (editingAddress.value) {
    emit('updated', address)
    return
  }

  emit('added', address)
}

function onAddressDeleted(addressId: number) {
  emit('removed', addressId)
}

function cityStatePostal(address: ApiContactAddress) {
  return [address.city, address.state, address.postal_code].filter(Boolean).join(', ')
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-dimmed">
          {{ $t('forms.contact.addressesSection') }}
        </h2>
        <UButton
          icon="i-lucide-plus"
          :label="$t('forms.contact.addAddress')"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="openAddAddress"
        />
      </div>
    </template>

    <div
      v-if="!sortedAddresses.length"
      class="py-4 text-center text-sm text-dimmed"
    >
      {{ $t('common.emptyValue') }}
    </div>
    <ul
      v-else
      class="divide-y divide-default"
    >
      <li
        v-for="address in sortedAddresses"
        :key="address.id"
        class="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
          <UIcon
            name="i-lucide-map-pin"
            class="size-4 text-dimmed"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p
                v-if="address.line1"
                class="text-sm font-medium text-highlighted"
              >
                {{ address.line1 }}
              </p>
              <p
                v-if="address.line2"
                class="mt-0.5 text-sm text-dimmed"
              >
                {{ address.line2 }}
              </p>
              <p
                v-if="cityStatePostal(address)"
                class="mt-0.5 text-xs text-dimmed"
              >
                {{ cityStatePostal(address) }}
              </p>
              <p
                v-if="address.country?.name"
                class="mt-0.5 text-xs text-dimmed"
              >
                {{ address.country.name }}
              </p>
              <p class="mt-1 text-xs text-dimmed">
                {{ $t(`contactAddressType.${address.type}`) }}
                <template v-if="address.label">
                  · {{ address.label }}
                </template>
              </p>
            </div>
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="$t('common.edit')"
              @click="openEditAddress(address)"
            />
          </div>
          <div
            v-if="address.is_primary"
            class="mt-2"
          >
            <UBadge
              :label="$t('forms.address.isPrimary')"
              color="primary"
              variant="subtle"
              size="xs"
            />
          </div>
        </div>
      </li>
    </ul>

    <ContactAddressFormSlideover
      v-model:open="showAddressForm"
      :contact-id="contactId"
      :address="editingAddress"
      @saved="onAddressSaved"
      @deleted="onAddressDeleted"
    />
  </UCard>
</template>
