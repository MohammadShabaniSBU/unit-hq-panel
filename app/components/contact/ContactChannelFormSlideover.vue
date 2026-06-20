<script setup lang="ts">
import { CONTACT_CHANNEL_TYPES } from '~/types/contactChannel'
import type { ApiContactChannel } from '~/types/contactChannel'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  contactId: number
  channel?: ApiContactChannel | null
}>()

const emit = defineEmits<{
  saved: [channel: ApiContactChannel]
  deleted: [channelId: number]
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, deleting, error, fieldErrors, reset, submit, remove } = useContactChannelForm()

const isEditing = computed(() => Boolean(props.channel))

const typeOptions = computed(() =>
  CONTACT_CHANNEL_TYPES.map(value => ({
    label: t(`contactChannelType.${value}`),
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
    reset(props.channel ?? null)
    return
  }

  reset()
})

watch(() => props.channel, (channel) => {
  if (open.value) {
    reset(channel ?? null)
  }
})

async function onSubmit() {
  const savedChannel = await submit(props.contactId, props.channel?.id)

  if (!savedChannel) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.channel.editSuccessMessage')
      : t('forms.channel.createSuccessMessage'),
    color: 'success'
  })

  emit('saved', savedChannel)
  close()
}

async function onDelete() {
  if (!props.channel) {
    return
  }

  const deleted = await remove(props.contactId, props.channel.id)

  if (!deleted) {
    return
  }

  toast.add({
    title: t('forms.channel.deleteSuccessMessage'),
    color: 'success'
  })

  emit('deleted', props.channel.id)
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="isEditing ? $t('forms.channel.editTitle') : $t('forms.channel.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.channel.type')"
          name="type"
          required
          :error="fieldError('type')"
        >
          <USelect
            v-model="form.type"
            :items="typeOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.channel.type')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.channel.value')"
          name="value"
          required
          :error="fieldError('value')"
        >
          <UInput
            v-model="form.value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.channel.label')"
          name="label"
          :error="fieldError('label')"
        >
          <UInput
            v-model="form.label"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-2">
          <UFormField
            :label="$t('forms.channel.isPrimary')"
            name="is_primary"
            :error="fieldError('is_primary')"
          >
            <USwitch v-model="form.is_primary" />
          </UFormField>


          <UFormField
            :label="$t('forms.channel.optedIn')"
            name="opted_in"
            :error="fieldError('opted_in')"
          >
            <USwitch v-model="form.opted_in" />
          </UFormField>
        </div>

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
            :label="$t('forms.channel.delete')"
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
              :label="$t('forms.channel.cancel')"
              color="neutral"
              variant="outline"
              :disabled="submitting || deleting"
              @click="close"
            />
            <UButton
              type="submit"
              :label="$t('forms.channel.save')"
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
