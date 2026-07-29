<script setup lang="ts">
import type { ApiSiteSenderIdentity, CommunicationChannel } from '~/types/communications'

const props = defineProps<{
  siteId: number
}>()

const { t } = useI18n()
const toast = useToast()

const siteIdRef = computed(() => props.siteId)
const { identities, pending, error, refresh, stateFor, save } = useSiteSenderIdentities(siteIdRef)

const isUnauthorized = computed(() => {
  const status = (error.value as { statusCode?: number, status?: number } | null)?.statusCode
    ?? (error.value as { statusCode?: number, status?: number } | null)?.status
  return status === 401
})

interface FormRow {
  from_name: string
  from_email: string
  from_number: string
  reply_to_email: string
}

const forms = reactive<Record<string, FormRow>>({})

function formFor(identity: ApiSiteSenderIdentity): FormRow {
  forms[identity.channel] ??= {
    from_name: identity.from_name ?? '',
    from_email: identity.from_email ?? '',
    from_number: identity.from_number ?? '',
    reply_to_email: identity.reply_to_email ?? ''
  }
  return forms[identity.channel] as FormRow
}

watch(identities, (rows) => {
  for (const identity of rows) {
    forms[identity.channel] = {
      from_name: identity.from_name ?? '',
      from_email: identity.from_email ?? '',
      from_number: identity.from_number ?? '',
      reply_to_email: identity.reply_to_email ?? ''
    }
  }
}, { immediate: true })

function channelLabel(channel: CommunicationChannel) {
  return t(`forms.communications.channels.${channel}`)
}

function isEmailChannel(channel: CommunicationChannel) {
  return channel === 'email'
}

async function onSave(identity: ApiSiteSenderIdentity) {
  const ok = await save(identity.channel, formFor(identity))
  if (ok) {
    toast.add({ title: t('forms.communications.senderIdentitySaved'), color: 'success' })
  }
}
</script>

<template>
  <div
    v-if="pending"
    class="flex items-center justify-center py-12"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="size-5 animate-spin text-dimmed"
    />
  </div>

  <div
    v-else-if="error"
    class="rounded-lg border border-error/30 bg-error/5 p-4"
  >
    <p class="text-sm text-error">
      {{ isUnauthorized ? t('pages.settings.authRequired') : t('pages.settings.siteLoadError') }}
    </p>
    <UButton
      v-if="isUnauthorized"
      to="/login"
      :label="t('pages.settings.signIn')"
      color="primary"
      size="sm"
      class="mt-3"
    />
    <UButton
      v-else
      :label="$t('common.retry')"
      color="neutral"
      variant="outline"
      size="sm"
      class="mt-3"
      @click="refresh()"
    />
  </div>

  <div
    v-else
    class="flex flex-col gap-5"
  >
    <p class="text-sm text-dimmed">
      {{ t('forms.communications.senderIdentityHelp') }}
    </p>

    <div
      v-for="identity in identities"
      :key="identity.channel"
      class="rounded-lg border border-default p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium text-highlighted">
          {{ channelLabel(identity.channel) }}
        </p>
        <UBadge
          v-if="identity.verified_at"
          color="success"
          variant="subtle"
          :label="t('forms.communications.senderVerified')"
        />
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <UFormField :label="t('forms.communications.fromName')">
          <UInput
            v-model="formFor(identity).from_name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="isEmailChannel(identity.channel)"
          :label="t('forms.communications.fromEmail')"
        >
          <UInput
            v-model="formFor(identity).from_email"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-else
          :label="t('forms.communications.fromNumber')"
        >
          <UInput
            v-model="formFor(identity).from_number"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="isEmailChannel(identity.channel)"
          :label="t('forms.communications.replyToEmail')"
        >
          <UInput
            v-model="formFor(identity).reply_to_email"
            type="email"
            class="w-full"
          />
        </UFormField>
      </div>

      <p
        v-if="stateFor(identity.channel).error"
        class="mt-2 text-sm text-error"
      >
        {{ stateFor(identity.channel).error }}
      </p>

      <div class="mt-4 flex justify-end">
        <UButton
          :label="$t('forms.settings.save')"
          color="primary"
          :loading="stateFor(identity.channel).submitting"
          @click="onSave(identity)"
        />
      </div>
    </div>
  </div>
</template>
