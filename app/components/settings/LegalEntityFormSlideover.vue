<script setup lang="ts">
import type { ApiLegalEntity, TaxIdType } from '~/types/legalEntity'

const open = defineModel<boolean>('open', { default: false })
const entity = defineModel<ApiLegalEntity | null>('entity', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, isEditing, load, reset, submit } = useLegalEntityForm()

const title = computed(() =>
  isEditing.value ? t('forms.legalEntity.editTitle') : t('forms.legalEntity.createTitle')
)

const taxIdTypeItems = computed(() => ([
  { value: 'nif' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.nif') },
  { value: 'siren' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.siren') },
  { value: 'uk_crn' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.uk_crn') },
  { value: 'vat' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.vat') },
  { value: 'other' as TaxIdType, label: t('forms.legalEntity.taxIdTypes.other') }
]))

const fiscalRegimeItems = computed(() => ([
  { value: 'none', label: t('forms.legalEntity.fiscalRegimes.none') }
]))

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, entity], ([isOpen, currentEntity]) => {
  if (isOpen) {
    load(currentEntity)
    return
  }

  reset()
  entity.value = null
})

async function onSubmit() {
  const saved = await submit()

  if (!saved) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.legalEntity.editSuccessMessage')
      : t('forms.legalEntity.createSuccessMessage'),
    color: 'success'
  })

  emit('saved')
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="title"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.legalEntity.legalName')"
          name="legal_name"
          required
          :error="fieldError('legal_name')"
        >
          <UInput
            v-model="form.legal_name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.legalEntity.tradingName')"
          name="trading_name"
          :error="fieldError('trading_name')"
        >
          <UInput
            v-model="form.trading_name"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('forms.legalEntity.taxId')"
            name="tax_id"
            required
            :error="fieldError('tax_id')"
          >
            <UInput
              v-model="form.tax_id"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.legalEntity.taxIdType')"
            name="tax_id_type"
            required
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
          :label="$t('forms.legalEntity.vatNumber')"
          name="vat_number"
          :error="fieldError('vat_number')"
        >
          <UInput
            v-model="form.vat_number"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.legalEntity.countryCode')"
          name="country_code"
          required
          :error="fieldError('country_code')"
        >
          <UInput
            v-model="form.country_code"
            maxlength="2"
            class="w-full uppercase"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.legalEntity.addressLine1')"
          name="address_line1"
          required
          :error="fieldError('address_line1')"
        >
          <UInput
            v-model="form.address_line1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.legalEntity.addressLine2')"
          name="address_line2"
          :error="fieldError('address_line2')"
        >
          <UInput
            v-model="form.address_line2"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('forms.legalEntity.city')"
            name="city"
            required
            :error="fieldError('city')"
          >
            <UInput
              v-model="form.city"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.legalEntity.postalCode')"
            name="postal_code"
            required
            :error="fieldError('postal_code')"
          >
            <UInput
              v-model="form.postal_code"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('forms.legalEntity.fiscalRegime')"
          name="fiscal_regime"
          required
          :error="fieldError('fiscal_regime')"
        >
          <USelect
            v-model="form.fiscal_regime"
            :items="fiscalRegimeItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.legalEntity.sepaCreditorId')"
          name="sepa_creditor_id"
          :error="fieldError('sepa_creditor_id')"
        >
          <UInput
            v-model="form.sepa_creditor_id"
            class="w-full"
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
            :label="$t('forms.legalEntity.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.legalEntity.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
