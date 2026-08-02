<script setup lang="ts">
import type { ApiContactChannel } from '~/types/contactChannel'

const props = defineProps<{
  contactId: number
  channels?: Array<ApiContactChannel>
}>()

const emit = defineEmits<{
  added: [channel: ApiContactChannel]
  updated: [channel: ApiContactChannel]
  removed: [channelId: number]
}>()

const showChannelForm = ref(false)
const editingChannel = ref<ApiContactChannel | null>(null)

function channelTypeIcon(type: string) {
  if (type === 'email') return 'i-lucide-mail'
  if (type === 'phone') return 'i-lucide-phone'
  if (type === 'sms') return 'i-lucide-message-square'
  if (type === 'whatsapp') return 'i-lucide-message-circle'
  return 'i-lucide-at-sign'
}

function openAddChannel() {
  editingChannel.value = null
  showChannelForm.value = true
}

function openEditChannel(channel: ApiContactChannel) {
  editingChannel.value = channel
  showChannelForm.value = true
}

function onChannelSaved(channel: ApiContactChannel) {
  if (editingChannel.value) {
    emit('updated', channel)
    return
  }

  emit('added', channel)
}

function onChannelDeleted(channelId: number) {
  emit('removed', channelId)
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-dimmed">
          {{ $t('forms.contact.channelsSection') }}
        </h2>
        <UButton
          icon="i-lucide-plus"
          :label="$t('forms.contact.addChannel')"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="openAddChannel"
        />
      </div>
    </template>

    <div
      v-if="!channels?.length"
      class="py-4 text-center text-sm text-dimmed"
    >
      {{ $t('common.emptyValue') }}
    </div>
    <ul
      v-else
      class="divide-y divide-default"
    >
      <li
        v-for="channel in channels"
        :key="channel.id"
        class="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
          <UIcon
            :name="channelTypeIcon(channel.type)"
            class="size-4 text-dimmed"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                {{ channel.value }}
              </p>
              <p class="mt-0.5 text-xs text-dimmed">
                {{ $t(`contactChannelType.${channel.type}`) }}
                <template v-if="channel.label">
                  · {{ channel.label }}
                </template>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
              <CallsCallButton
                v-if="channel.type === 'phone'"
                :contact-id="contactId"
                :to-number="channel.value"
                context-type="contact"
                :context-id="contactId"
                icon-only
                size="xs"
                color="neutral"
                variant="ghost"
              />
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="$t('common.edit')"
                @click="openEditChannel(channel)"
              />
            </div>
          </div>
          <div
            v-if="channel.is_primary"
            class="mt-2"
          >
            <UBadge
              :label="$t('forms.channel.isPrimary')"
              color="primary"
              variant="subtle"
              size="xs"
            />
          </div>
        </div>
      </li>
    </ul>

    <ContactChannelFormSlideover
      v-model:open="showChannelForm"
      :contact-id="contactId"
      :channel="editingChannel"
      @saved="onChannelSaved"
      @deleted="onChannelDeleted"
    />
  </UCard>
</template>
