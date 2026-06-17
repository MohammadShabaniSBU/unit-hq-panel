<script setup lang="ts">
import type { ApiUnitClass } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })
const unitClass = defineModel<ApiUnitClass | null>('unitClass', { default: null })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const {
  sites,
  form,
  billingSummary,
  loading,
  submitting,
  error,
  fieldErrors,
  load,
  reset,
  save
} = useUnitClassPrices()

const title = computed(() => {
  if (!unitClass.value) {
    return t('forms.unitClassPrices.title')
  }

  return t('forms.unitClassPrices.titleForClass', {
    code: unitClass.value.code,
    label: unitClass.value.label
  })
})

function close() {
  open.value = false
}

watch([open, unitClass], ([isOpen, currentUnitClass]) => {
  if (isOpen) {
    load(currentUnitClass)
    return
  }

  reset()
  unitClass.value = null
})

async function onSubmit() {
  if (!unitClass.value) {
    return
  }

  const saved = await save(unitClass.value.id)

  if (!saved) {
    return
  }

  toast.add({
    title: t('forms.unitClassPrices.saveSuccessMessage'),
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
        <p
          v-if="billingSummary"
          class="text-sm text-dimmed"
        >
          {{ billingSummary }}
        </p>

        <div
          v-if="loading"
          class="flex items-center justify-center py-12"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-dimmed"
          />
        </div>

        <div
          v-else-if="error && !sites.length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div
          v-else
          class="flex max-h-[calc(100dvh-14rem)] flex-col gap-3 overflow-y-auto"
        >
          <div
            v-for="site in sites"
            :key="site.site_id"
            class="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 rounded-lg border border-default p-3"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">
                {{ site.site_name }}
              </p>
              <p
                v-if="!form[site.site_id] && !site.amount"
                class="mt-0.5 text-xs text-dimmed"
              >
                {{ $t('forms.unitClassPrices.noPriceSet') }}
              </p>
            </div>

            <UFormField
              :name="`amount-${site.site_id}`"
              :error="fieldErrors.amount?.[0]"
            >
              <UInput
                v-model="form[site.site_id]"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
                :placeholder="$t('forms.unitClassPrices.amount')"
              />
            </UFormField>
          </div>
        </div>

        <div
          v-if="error && sites.length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('forms.unitClassPrices.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting || loading"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.unitClassPrices.save')"
            color="primary"
            :loading="submitting"
            :disabled="loading"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
