<script setup lang="ts">
import type { PreferenceAdvertisingState, PreferenceChange, PreferenceListState } from '~/types/preferenceCenter'

interface EditableChannel {
  channel: string
  subscribed: boolean
  initial: boolean
}

interface EditableAdvertising extends PreferenceAdvertisingState {
  initial: boolean
}

interface EditableList extends Omit<PreferenceListState, 'channels'> {
  channels: Array<EditableChannel>
}

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t, setLocale } = useI18n()
const branding = useBrandingStore()

const token = computed(() => String(route.params.token ?? ''))

const {
  preferences,
  pending,
  saving,
  error,
  saveError,
  fetchByToken,
  save
} = usePreferenceCenter()

const lists = ref<Array<EditableList>>([])
const advertising = ref<EditableAdvertising | null>(null)
const saved = ref(false)
const unsubscribed = ref(false)
const confirmingAll = ref(false)

const companyName = computed(() => branding.companyName.trim() || null)

const isNotFound = computed(() => {
  if (pending.value || preferences.value) return false
  if (!error.value) return false
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404
})

const hasChanges = computed(() =>
  lists.value.some(list => list.channels.some(channel => channel.subscribed !== channel.initial))
  || (advertising.value != null && advertising.value.subscribed !== advertising.value.initial)
)

function applyPayload() {
  lists.value = (preferences.value?.lists ?? []).map(list => ({
    ...list,
    channels: list.channels.map(channel => ({
      ...channel,
      initial: channel.subscribed
    }))
  }))
  const ads = preferences.value?.advertising
  advertising.value = ads
    ? { ...ads, initial: ads.subscribed }
    : null
}

function channelLabel(channel: string): string {
  return t(`pages.preferences.channels.${channel}`)
}

async function onSave() {
  const changes: Array<PreferenceChange> = []
  for (const list of lists.value) {
    for (const channel of list.channels) {
      if (channel.subscribed !== channel.initial) {
        changes.push({
          list_id: list.id,
          channel: channel.channel,
          subscribed: channel.subscribed
        })
      }
    }
  }

  if (advertising.value != null && advertising.value.subscribed !== advertising.value.initial) {
    changes.push({
      list_id: advertising.value.list_id,
      channel: 'ads',
      subscribed: advertising.value.subscribed
    })
  }

  if (changes.length === 0) return

  saved.value = false
  unsubscribed.value = false
  try {
    await save(token.value, changes, false)
    applyPayload()
    saved.value = true
  } catch {
    saved.value = false
  }
}

async function onUnsubscribeAll() {
  if (!confirmingAll.value) {
    confirmingAll.value = true
    return
  }

  saved.value = false
  try {
    await save(token.value, [], true)
    applyPayload()
    confirmingAll.value = false
    unsubscribed.value = true
  } catch {
    confirmingAll.value = true
  }
}

onMounted(async () => {
  void branding.load()
  await fetchByToken(token.value)
  const locale = preferences.value?.locale
  if (locale === 'en' || locale === 'es' || locale === 'fr') {
    await setLocale(locale)
  }
  applyPayload()
})
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-12 sm:px-8">
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center text-sm text-dimmed"
    >
      {{ $t('pages.preferences.title') }}…
    </div>

    <div
      v-else-if="isNotFound"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
    >
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('pages.preferences.notFound') }}
      </h1>
      <p class="text-sm text-dimmed">
        {{ $t('pages.preferences.notFoundDescription') }}
      </p>
    </div>

    <div
      v-else-if="error && !preferences"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
    >
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('pages.preferences.loadError') }}
      </h1>
    </div>

    <template v-else-if="preferences">
      <header class="mb-8 text-center">
        <p
          v-if="companyName"
          class="text-sm font-medium uppercase tracking-wide text-dimmed"
        >
          {{ companyName }}
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-highlighted">
          <template v-if="preferences.contact_first_name">
            {{ $t('pages.preferences.greeting', { name: preferences.contact_first_name }) }}
          </template>
          <template v-else>
            {{ $t('pages.preferences.greetingAnonymous') }}
          </template>
        </h1>
        <p class="mt-2 text-sm text-dimmed">
          <template v-if="companyName">
            {{ $t('pages.preferences.intro', { company: companyName }) }}
          </template>
          <template v-else>
            {{ $t('pages.preferences.introNoCompany') }}
          </template>
        </p>
      </header>

      <div
        v-if="unsubscribed"
        class="mb-6 rounded-xl border border-success/30 bg-success/5 px-4 py-4 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('pages.preferences.unsubscribed') }}
        </h2>
      </div>

      <div
        v-else-if="saved"
        class="mb-6 rounded-xl border border-success/30 bg-success/5 px-4 py-4 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('pages.preferences.saved') }}
        </h2>
      </div>

      <p
        v-if="lists.length === 0 && !advertising"
        class="text-center text-sm text-dimmed"
      >
        {{ $t('pages.preferences.empty') }}
      </p>

      <ul
        v-else-if="lists.length > 0"
        class="flex flex-col gap-4"
      >
        <li
          v-for="list in lists"
          :key="list.id"
          class="rounded-xl border border-default bg-default px-4 py-4 shadow-sm"
        >
          <h2 class="text-base font-semibold text-highlighted">
            {{ list.label }}
          </h2>
          <p
            v-if="list.description"
            class="mt-1 text-sm text-dimmed"
          >
            {{ list.description }}
          </p>
          <div class="mt-3 flex flex-col gap-3">
            <label
              v-for="channel in list.channels"
              :key="channel.channel"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-highlighted">
                {{ channelLabel(channel.channel) }}
              </span>
              <USwitch v-model="channel.subscribed" />
            </label>
          </div>
        </li>
      </ul>

      <div
        v-if="advertising"
        class="mt-4 rounded-xl border border-default bg-default px-4 py-4 shadow-sm"
      >
        <label class="flex items-center justify-between gap-3">
          <span>
            <span class="text-sm font-medium text-highlighted">
              {{ advertising.label }}
            </span>
            <p
              v-if="advertising.description"
              class="mt-1 text-sm text-dimmed"
            >
              {{ advertising.description }}
            </p>
          </span>
          <USwitch v-model="advertising.subscribed" />
        </label>
      </div>

      <p
        v-if="saveError"
        class="mt-4 text-sm text-error"
      >
        {{ saveError || $t('pages.preferences.saveError') }}
      </p>

      <div class="mt-6 flex flex-col gap-3">
        <UButton
          color="primary"
          size="lg"
          block
          :label="saving ? $t('pages.preferences.saving') : $t('pages.preferences.save')"
          :loading="saving"
          :disabled="saving || !hasChanges"
          @click="onSave"
        />

        <p
          v-if="confirmingAll"
          class="text-center text-sm text-dimmed"
        >
          {{ $t('pages.preferences.confirmUnsubscribe') }}
        </p>

        <div
          v-if="confirmingAll"
          class="flex gap-3"
        >
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            block
            :label="$t('pages.preferences.cancel')"
            :disabled="saving"
            @click="confirmingAll = false"
          />
          <UButton
            color="error"
            size="lg"
            block
            :label="$t('pages.preferences.confirm')"
            :loading="saving"
            :disabled="saving"
            @click="onUnsubscribeAll"
          />
        </div>

        <UButton
          v-else
          color="neutral"
          variant="outline"
          size="lg"
          block
          :label="$t('pages.preferences.unsubscribeAll')"
          :disabled="saving"
          @click="onUnsubscribeAll"
        />
      </div>
    </template>
  </div>
</template>
