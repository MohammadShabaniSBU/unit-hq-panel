<script setup lang="ts">
import type { ApiActivityLogSettings } from '~/types/activity'

const props = defineProps<{
  settings: ApiActivityLogSettings | null
  pending: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const {
  form,
  optionalChannels,
  submitting,
  error,
  fieldErrors,
  load,
  isChannelEnabled,
  setChannelEnabled,
  submit
} = useActivityLogSettingsForm()

const retentionOptions = computed(() =>
  [3, 6, 12, 24, 36, 48, 60].map(months => ({
    label: t('forms.settings.retentionMonths', { count: months }),
    value: months
  }))
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

watch(
  () => props.settings,
  (settings) => {
    if (settings) {
      load(settings)
    }
  },
  { immediate: true }
)

async function onSubmit() {
  const saved = await submit()
  if (!saved) {
    return
  }

  load(saved)
  toast.add({
    title: t('forms.settings.saveSuccessMessage'),
    color: 'success'
  })
}
</script>

<template>
  <div
    v-if="pending"
    class="flex items-center justify-center py-16"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin text-dimmed"
    />
  </div>

  <form
    v-else
    class="flex flex-col gap-6"
    @submit.prevent="onSubmit"
  >
    <div class="flex flex-col gap-3">
      <p class="text-sm font-medium text-highlighted">
        {{ $t('forms.settings.activityChannels') }}
      </p>
      <p class="text-sm text-dimmed">
        {{ $t('forms.settings.activityChannelsHelp') }}
      </p>

      <div class="flex items-center justify-between rounded-lg border border-default px-4 py-3">
        <div>
          <p class="text-sm font-medium">
            {{ $t('activity.channels.core') }}
          </p>
          <p class="text-xs text-dimmed">
            {{ $t('forms.settings.coreAlwaysOn') }}
          </p>
        </div>
        <UBadge
          color="neutral"
          variant="subtle"
          :label="$t('forms.settings.alwaysOn')"
        />
      </div>

      <div
        v-for="channel in optionalChannels"
        :key="channel"
        class="flex items-center justify-between rounded-lg border border-default px-4 py-3"
      >
        <p class="text-sm font-medium">
          {{ $t(`activity.channels.${channel}`) }}
        </p>
        <USwitch
          :model-value="isChannelEnabled(channel)"
          @update:model-value="setChannelEnabled(channel, $event)"
        />
      </div>
    </div>

    <UFormField
      :label="$t('forms.settings.activityRetention')"
      name="retention_months"
      required
      :error="fieldError('retention_months')"
      :help="$t('forms.settings.activityRetentionHelp')"
    >
      <USelect
        v-model="form.retention_months"
        :items="retentionOptions"
        value-key="value"
        label-key="label"
        class="w-full max-w-xs"
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

    <div class="flex justify-end border-t border-default pt-5">
      <UButton
        type="submit"
        :label="$t('forms.settings.save')"
        color="primary"
        :loading="submitting"
      />
    </div>
  </form>
</template>
