<script setup lang="ts">
import { CONTACT_ADDRESS_TYPES } from '~/types/contactAddress'
import type { ApiContactAddress } from '~/types/contactAddress'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  contactId: number
  address?: ApiContactAddress | null
}>()

const emit = defineEmits<{
  saved: [address: ApiContactAddress]
  deleted: [addressId: number]
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, deleting, error, fieldErrors, reset, submit, remove } = useContactAddressForm()
const { items: countryItems } = useOptions('/api/countries/options')

const isEditing = computed(() => Boolean(props.address))

const typeOptions = computed(() =>
  CONTACT_ADDRESS_TYPES.map(value => ({
    label: t(`contactAddressType.${value}`),
    value
  }))
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    reset(props.address ?? null)
    return
  }

  reset()
})

watch(() => props.address, (address) => {
  if (open.value) {
    reset(address ?? null)
  }
})

async function onSubmit() {
  const savedAddress = await submit(props.contactId, props.address?.id)

  if (!savedAddress) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.address.editSuccessMessage')
      : t('forms.address.createSuccessMessage'),
    color: 'success'
  })

  emit('saved', savedAddress)
  close()
}

async function onDelete() {
  if (!props.address) {
    return
  }

  const deleted = await remove(props.contactId, props.address.id)

  if (!deleted) {
    return
  }

  toast.add({
    title: t('forms.address.deleteSuccessMessage'),
    color: 'success'
  })

  emit('deleted', props.address.id)
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="isEditing ? $t('forms.address.editTitle') : $t('forms.address.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.address.type')"
          name="type"
          required
          :error="fieldError('type')"
        >
          <USelect
            v-model="form.type"
            :items="typeOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.address.type')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.address.line1')"
          name="line1"
          :error="fieldError('line1')"
        >
          <UInput
            v-model="form.line1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.address.line2')"
          name="line2"
          :error="fieldError('line2')"
        >
          <UInput
            v-model="form.line2"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-2">
          <UFormField
            :label="$t('forms.address.city')"
            name="city"
            :error="fieldError('city')"
          >
            <UInput
              v-model="form.city"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.address.state')"
            name="state"
            :error="fieldError('state')"
          >
            <UInput
              v-model="form.state"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <UFormField
            :label="$t('forms.address.postalCode')"
            name="postal_code"
            :error="fieldError('postal_code')"
          >
            <UInput
              v-model="form.postal_code"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.address.country')"
            name="country_id"
            :error="fieldError('country_id')"
          >
            <USelect
              v-model="form.country_id"
              :items="countryItems"
              value-key="value"
              label-key="title"
              :placeholder="$t('forms.address.country')"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('forms.address.label')"
          name="label"
          :error="fieldError('label')"
        >
          <UInput
            v-model="form.label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.address.isPrimary')"
          name="is_primary"
          :error="fieldError('is_primary')"
        >
          <USwitch v-model="form.is_primary" />
        </UFormField>

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-between gap-2 pt-2">
          <UButton
            v-if="isEditing"
            type="button"
            :label="$t('forms.address.delete')"
            color="error"
            variant="outline"
            :loading="deleting"
            :disabled="submitting"
            @click="onDelete"
          />
          <div
            v-else
            class="flex-1"
          />

          <div class="flex gap-2">
            <UButton
              type="button"
              :label="$t('forms.address.cancel')"
              color="neutral"
              variant="outline"
              :disabled="submitting || deleting"
              @click="close"
            />
            <UButton
              type="submit"
              :label="$t('forms.address.save')"
              color="primary"
              :loading="submitting"
              :disabled="deleting"
            />
          </div>
        </div>
      </form>
    </template>
  </USlideover>
</template>
