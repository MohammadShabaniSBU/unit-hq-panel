<script setup lang="ts">
import type { ApiSite } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const site = defineModel<ApiSite | null>('site', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, isEditing, load, reset, submit } = useSiteForm()
const { items: countryItems } = useOptions('/api/countries/options')

const timezoneItems = (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC', 'Europe/Madrid', 'Europe/London', 'America/New_York']
).map(tz => ({ value: tz, title: tz }))

const title = computed(() =>
  isEditing.value ? t('forms.site.editTitle') : t('forms.site.createTitle')
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, site], ([isOpen, currentSite]) => {
  if (isOpen) {
    load(currentSite)
    return
  }

  reset()
  site.value = null
})

async function onSubmit() {
  const savedSite = await submit()

  if (!savedSite) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.site.editSuccessMessage')
      : t('forms.site.createSuccessMessage'),
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
          :label="$t('forms.site.name')"
          name="name"
          required
          :error="fieldError('name')"
        >
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.site.code')"
          name="code"
          :error="fieldError('code')"
        >
          <UInput
            v-model="form.code"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.site.timezone')"
          name="timezone"
          required
          :error="fieldError('timezone')"
        >
          <USelect
            v-model="form.timezone"
            :items="timezoneItems"
            value-key="value"
            label-key="title"
            :placeholder="$t('forms.site.timezonePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.site.address')"
          name="address"
          :error="fieldError('address')"
        >
          <UTextarea
            v-model="form.address"
            :rows="2"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.site.addressLine2')"
          name="address_line_2"
          :error="fieldError('address_line_2')"
        >
          <UInput
            v-model="form.address_line_2"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('forms.site.city')"
            name="city"
            :error="fieldError('city')"
          >
            <UInput
              v-model="form.city"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.site.stateRegion')"
            name="state_region"
            :error="fieldError('state_region')"
          >
            <UInput
              v-model="form.state_region"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('forms.site.postalCode')"
            name="postal_code"
            :error="fieldError('postal_code')"
          >
            <UInput
              v-model="form.postal_code"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.site.country')"
            name="country_id"
            :error="fieldError('country_id')"
          >
            <USelect
              v-model="form.country_id"
              :items="countryItems"
              value-key="value"
              label-key="title"
              :placeholder="$t('forms.site.country')"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('forms.site.contactEmail')"
          name="contact_email"
          :error="fieldError('contact_email')"
        >
          <UInput
            v-model="form.contact_email"
            type="email"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.site.contactPhone')"
          name="contact_phone"
          :error="fieldError('contact_phone')"
        >
          <UInput
            v-model="form.contact_phone"
            type="tel"
            class="w-full"
          />
        </UFormField>

        <fieldset class="space-y-3">
          <legend class="text-sm font-medium text-highlighted">
            {{ $t('forms.site.location') }}
          </legend>

          <div class="grid grid-cols-2 gap-3">
            <UFormField
              :label="$t('forms.site.lat')"
              name="location_lat"
              :error="fieldError('location.lat')"
            >
              <UInput
                v-model.number="form.location_lat"
                type="number"
                step="any"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('forms.site.lng')"
              name="location_lng"
              :error="fieldError('location.lng')"
            >
              <UInput
                v-model.number="form.location_lng"
                type="number"
                step="any"
                class="w-full"
              />
            </UFormField>
          </div>
        </fieldset>

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
            :label="$t('forms.site.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.site.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
