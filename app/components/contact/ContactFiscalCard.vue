<script setup lang="ts">
import type { ApiContact } from '~/types/contact'

const props = defineProps<{
  contact: ApiContact
}>()

const emit = defineEmits<{
  saved: [contact: ApiContact]
}>()

const { t } = useI18n()
const showForm = ref(false)

const displayBillingName = computed(() => {
  if (props.contact.billing_name) {
    return props.contact.billing_name
  }

  return [props.contact.first_name, props.contact.last_name].filter(Boolean).join(' ')
})

const hasAnyFiscal = computed(() =>
  Boolean(
    props.contact.billing_name
    || props.contact.tax_id
    || props.contact.billing_address_line1
    || props.contact.billing_city
    || props.contact.billing_postal_code
    || props.contact.billing_country_code
  )
)

const addressLine = computed(() => {
  const parts = [
    props.contact.billing_address_line1,
    props.contact.billing_address_line2
  ].filter(Boolean)

  return parts.join(', ')
})

const cityPostal = computed(() => {
  return [
    props.contact.billing_city,
    props.contact.billing_postal_code,
    props.contact.billing_country_code
  ].filter(Boolean).join(', ')
})

const taxIdLabel = computed(() => {
  if (!props.contact.tax_id) {
    return null
  }

  const type = props.contact.tax_id_type
    ? t(`forms.legalEntity.taxIdTypes.${props.contact.tax_id_type}`)
    : null

  return type ? `${props.contact.tax_id} (${type})` : props.contact.tax_id
})

function onSaved(contact: ApiContact) {
  emit('saved', contact)
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-dimmed">
          {{ $t('pages.contacts.fiscal.title') }}
        </h2>
        <UButton
          icon="i-lucide-pencil"
          :label="$t('common.edit')"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="showForm = true"
        />
      </div>
    </template>

    <div
      v-if="!hasAnyFiscal"
      class="py-2 text-sm text-dimmed"
    >
      {{ $t('common.emptyValue') }}
    </div>
    <div
      v-else
      class="space-y-2 text-sm"
    >
      <p class="font-medium text-highlighted">
        {{ displayBillingName }}
      </p>
      <p
        v-if="taxIdLabel"
        class="text-dimmed"
      >
        {{ taxIdLabel }}
      </p>
      <p
        v-if="addressLine"
        class="text-dimmed"
      >
        {{ addressLine }}
      </p>
      <p
        v-if="cityPostal"
        class="text-xs text-dimmed"
      >
        {{ cityPostal }}
      </p>
    </div>

    <p
      v-if="!contact.fiscal_complete"
      class="mt-3 text-xs text-dimmed"
    >
      {{ $t('pages.contacts.fiscal.completenessHint') }}
    </p>

    <ContactFiscalFormSlideover
      v-model:open="showForm"
      :contact="contact"
      @saved="onSaved"
    />
  </UCard>
</template>
