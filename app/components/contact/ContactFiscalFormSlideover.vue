<script setup lang="ts">
import type { ApiContact } from '~/types/contact'
import type { TaxIdType } from '~/types/legalEntity'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  contact: ApiContact | null
}>()

const emit = defineEmits<{
  saved: [contact: ApiContact]
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, load, reset, submit } = useContactFiscalForm()

const taxIdTypeItems = computed(() => ([
  { value: 'nif' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.nif') },
  { value: 'nie' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.nie') },
  { value: 'siren' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.siren') },
  { value: 'siret' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.siret') },
  { value: 'uk_crn' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.uk_crn') },
  { value: 'vat' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.vat') },
  { value: 'other' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.other') }
]))

const taxIdHint = computed(() => {
  const key = `pages.contacts.fiscal.taxIdHints.${form.tax_id_type}`
  return t(key)
})

const billingNamePlaceholder = computed(() => {
  if (!props.contact) {
    return t('pages.contacts.fiscal.billingNamePlaceholder')
  }

  const name = [props.contact.first_name, props.contact.last_name].filter(Boolean).join(' ')
  return name || t('pages.contacts.fiscal.billingNamePlaceholder')
})

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, () => props.contact], ([isOpen, contact]) => {
  if (isOpen) {
    load(contact)
    return
  }

  reset()
})

async function onSubmit() {
  const saved = await submit()

  if (!saved) {
    return
  }

  toast.add({
    title: t('pages.contacts.fiscal.saveSuccess'),
    color: 'success'
  })

  emit('saved', saved)
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('pages.contacts.fiscal.editTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <p class="text-sm text-dimmed">
          {{ $t('pages.contacts.fiscal.snapshotHint') }}
        </p>

        <UFormField
          :label="$t('pages.contacts.fiscal.billingName')"
          name="billing_name"
          :error="fieldError('billing_name')"
        >
          <UInput
            v-model="form.billing_name"
            :placeholder="billingNamePlaceholder"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('pages.contacts.fiscal.taxId')"
            name="tax_id"
            :error="fieldError('tax_id')"
            :hint="taxIdHint"
          >
            <UInput
              v-model="form.tax_id"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('pages.contacts.fiscal.taxIdType')"
            name="tax_id_type"
            :error="fieldError('tax_id_type')"
          >
            <USelect
              v-model="form.tax_id_type"
              :items="taxIdTypeItems"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('pages.contacts.fiscal.addressLine1')"
          name="billing_address_line1"
          :error="fieldError('billing_address_line1')"
        >
          <UInput
            v-model="form.billing_address_line1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.contacts.fiscal.addressLine2')"
          name="billing_address_line2"
          :error="fieldError('billing_address_line2')"
        >
          <UInput
            v-model="form.billing_address_line2"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('pages.contacts.fiscal.city')"
            name="billing_city"
            :error="fieldError('billing_city')"
          >
            <UInput
              v-model="form.billing_city"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('pages.contacts.fiscal.postalCode')"
            name="billing_postal_code"
            :error="fieldError('billing_postal_code')"
          >
            <UInput
              v-model="form.billing_postal_code"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('pages.contacts.fiscal.countryCode')"
          name="billing_country_code"
          :error="fieldError('billing_country_code')"
        >
          <UInput
            v-model="form.billing_country_code"
            maxlength="2"
            class="w-full uppercase"
          />
        </UFormField>

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('common.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('common.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
