<script setup lang="ts">
import type { SiteServiceAreaKind } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  siteId: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const siteIdRef = computed(() => props.siteId)
const { form, submitting, error, fieldErrors, reset, submit } = useSiteServiceAreaForm(siteIdRef)

const kindItems = computed(() => ([
  { value: 'postcode' as SiteServiceAreaKind, label: t('facility.serviceAreas.kinds.postcode') },
  { value: 'postcode_prefix' as SiteServiceAreaKind, label: t('facility.serviceAreas.kinds.postcode_prefix') },
  { value: 'admin_region' as SiteServiceAreaKind, label: t('facility.serviceAreas.kinds.admin_region') }
]))

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, () => {
  reset()
})

async function onSubmit() {
  const saved = await submit()

  if (!saved) {
    return
  }

  toast.add({
    title: t('facility.serviceAreas.createSuccess'),
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
    :title="$t('facility.serviceAreas.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('facility.serviceAreas.kind')"
          name="kind"
          required
          :error="fieldError('kind')"
        >
          <USelect
            v-model="form.kind"
            :items="kindItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('facility.serviceAreas.value')"
          name="value"
          required
          :hint="$t('facility.serviceAreas.valueHint')"
          :error="fieldError('value')"
        >
          <UInput
            v-model="form.value"
            class="w-full"
            maxlength="64"
          />
        </UFormField>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="close"
        />
        <UButton
          :label="$t('facility.serviceAreas.create')"
          color="primary"
          :loading="submitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </USlideover>
</template>
